"""Real-play evaluation: top-1 agreement of a shop policy with human decisions.

Unlike benchmarkPolicy (forward simulation, which the rollout expert optimizes
by construction), this scores a policy against real human choices recorded in
ml/data/human-play/*.jsonl — a signal the rollout does not already optimize, so
a non-rollout-aligned policy (e.g. an LLM-teacher-distilled one) can show an edge
here that the headless benchmark structurally cannot credit.

Caveat: humans are not optimal, so agreement measures "plays like the recorded
human", not "plays well". It is a non-rollout cross-check, not ground truth — its
value grows with the quantity and skill of the recordings.

Usage:
    python evaluate_real_play.py <model.onnx> [more.onnx ...] --shop [--data f.jsonl ...]

Default --data: ml/data/human-play/*.jsonl
"""

import argparse
import glob
import os
import json
import sys
from collections import defaultdict

from dataset import DATASET_SCHEMA_VERSION, _iter_shop_records
from encoding import HAND_SLOTS, encode_decision, encode_shop_decision


def load_shop_eval_decisions(paths):
    """Returns [(candidate_vectors, chosen_index, kind)] for shop decisions."""
    decisions = []
    for path in paths:
        for record in _iter_shop_records(path):
            inputs, chosen = encode_shop_decision(record)
            if chosen < 0 or not inputs:
                continue
            decisions.append((inputs, chosen, record["kind"]))
    return decisions


def load_hand_eval_decisions(paths):
    """Returns [(candidate_vectors, chosen_index, kind)] for hand decisions.

    Kind is the chosen candidate's action (play / discard). Skips shop run
    events, non-v1 records, and hands too wide for the fixed-size encoding.
    """
    decisions = []
    for path in paths:
        with open(path, encoding="utf-8") as handle:
            for line in handle:
                line = line.strip()
                if not line:
                    continue
                record = json.loads(line)
                if record.get("kind") is not None:
                    continue
                if record.get("schemaVersion") != DATASET_SCHEMA_VERSION:
                    continue
                if len(record["state"]["hand"]) > HAND_SLOTS:
                    continue
                inputs, chosen = encode_decision(record)
                if chosen < 0 or not inputs:
                    continue
                decisions.append((inputs, chosen, record["candidates"][chosen]["action"]))
    return decisions


def chance_agreement(decisions):
    """Expected top-1 agreement of a uniform-random picker (mean 1/candidates)."""
    if not decisions:
        return 0.0
    return sum(1.0 / len(inputs) for inputs, _, _ in decisions) / len(decisions)


def agreement(decisions, score_fn):
    """Top-1 agreement of score_fn's argmax with the human choice.

    score_fn(candidate_vectors) -> list[float] logits, one per candidate.
    Returns {"n", "overall", "by_kind": {kind: (matches, total)}}.
    """
    if not decisions:
        return {"n": 0, "overall": 0.0, "by_kind": {}}
    matches = 0
    by_kind = defaultdict(lambda: [0, 0])
    for inputs, chosen, kind in decisions:
        logits = score_fn(inputs)
        pred = max(range(len(logits)), key=lambda i: logits[i])
        hit = 1 if pred == chosen else 0
        matches += hit
        by_kind[kind][0] += hit
        by_kind[kind][1] += 1
    return {
        "n": len(decisions),
        "overall": matches / len(decisions),
        "by_kind": {k: (m, t) for k, (m, t) in by_kind.items()},
    }


def onnx_score_fn(model_path):
    import numpy as np
    import onnxruntime as ort

    session = ort.InferenceSession(model_path)
    name = session.get_inputs()[0].name

    def score(inputs):
        candidates = np.array(inputs, dtype=np.float32)
        return session.run(None, {name: candidates})[0].ravel().tolist()

    return score


def _kind_cell(by_kind, kind):
    matches, total = by_kind.get(kind, (0, 0))
    return f"{matches / total:.3f} (n={total})" if total else "—"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("models", nargs="+")
    parser.add_argument("--shop", action="store_true")
    parser.add_argument("--data", action="append", default=[])
    args = parser.parse_args()

    data = args.data or sorted(
        glob.glob(os.path.join(os.path.dirname(__file__), "data", "human-play", "*.jsonl"))
    )
    label = "shop" if args.shop else "hand"
    decisions = (
        load_shop_eval_decisions(data) if args.shop else load_hand_eval_decisions(data)
    )
    if not decisions:
        sys.exit(f"no {label} decisions found in the human-play data")

    kinds = sorted({kind for _, _, kind in decisions})
    print(f"{len(decisions)} human {label} decisions from {len(data)} file(s)")
    print(f"random-chance agreement baseline: {chance_agreement(decisions):.3f}")
    print(f"{'model':32} {'agree':>14} " + " ".join(f"{k:>16}" for k in kinds))
    for model in args.models:
        r = agreement(decisions, onnx_score_fn(model))
        cells = " ".join(f"{_kind_cell(r['by_kind'], k):>16}" for k in kinds)
        print(f"{os.path.basename(model):32} {r['overall']:.3f} (n={r['n']:>4}) {cells}")


if __name__ == "__main__":
    main()
