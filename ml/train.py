"""Trains the advisor candidate scorer and exports it to ONNX.

Usage:
    python train.py <dataset.jsonl> [more.jsonl ...] [--human play.jsonl] [--human-weight 5] [--teacher labels.jsonl] [--teacher-weight 5] [--corrections human-play.jsonl] [--corrections-weight 5] [--min-score-fraction 0.25] [--epochs 30] [--out advisor-policy.onnx]

The model scores one (state, candidate) vector at a time; a decision is
made by running every candidate through the net and taking the argmax.
The ONNX export has input "candidates" of shape [N, INPUT_FEATURES] and
output "logits" of shape [N], so the browser runtime feeds all candidates
of a decision in one call.

--corrections ingests advice-feedback corrections from the human-play
exports as high-weight labels. Hand corrections pass the quality gate
(--min-score-fraction); shop corrections have no per-candidate score so the
gate does not apply (add --shop to train the shop policy). The full loop is
collect corrections -> train with --corrections -> benchmark
(scripts/benchmarkPolicy.ts) -> replace the model file only on a clear
avgBlinds win, the same bar as every policy release.
"""

import argparse
import random
import sys

import torch
from torch import nn

from dataset import (
    DEFAULT_MIN_SCORE_FRACTION,
    build_training_set,
    load_all,
    load_feedback_corrections,
    load_shop_decisions_split,
    split_by_seed,
)
from encoding import (
    ENCODING_VERSION,
    INPUT_FEATURES,
    SHOP_ENCODING_VERSION,
    SHOP_INPUT_FEATURES,
)


class CandidateScorer(nn.Module):
    def __init__(self, input_features, hidden):
        super().__init__()
        self.layers = nn.Sequential(
            nn.Linear(input_features, hidden),
            nn.ReLU(),
            nn.Linear(hidden, hidden // 2),
            nn.ReLU(),
            nn.Linear(hidden // 2, 1),
        )

    def forward(self, candidates):
        return self.layers(candidates).squeeze(-1)


def decision_loss(model, decision):
    inputs, chosen, weight = decision
    logits = model(torch.tensor(inputs, dtype=torch.float32))
    return weight * nn.functional.cross_entropy(
        logits.unsqueeze(0), torch.tensor([chosen])
    )


def accuracy(model, decisions):
    if not decisions:
        return 0.0
    correct = 0
    with torch.no_grad():
        for inputs, chosen, _ in decisions:
            logits = model(torch.tensor(inputs, dtype=torch.float32))
            if int(torch.argmax(logits)) == chosen:
                correct += 1
    return correct / len(decisions)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("datasets", nargs="+")
    parser.add_argument("--human", action="append", default=[])
    parser.add_argument("--human-weight", type=float, default=5.0)
    parser.add_argument(
        "--teacher",
        action="append",
        default=[],
        help="JSONL of LLM teacher labels (e.g. from labelDisagreements); trains, never held out",
    )
    parser.add_argument("--teacher-weight", type=float, default=5.0)
    parser.add_argument(
        "--corrections",
        action="append",
        default=[],
        help="JSONL of human-play exports; quality-gated advice-feedback corrections train as weighted labels",
    )
    parser.add_argument("--corrections-weight", type=float, default=5.0)
    parser.add_argument(
        "--min-score-fraction",
        type=float,
        default=DEFAULT_MIN_SCORE_FRACTION,
        help="quality gate for hand corrections: a corrected play must score at least this fraction of the best play",
    )
    parser.add_argument("--epochs", type=int, default=30)
    parser.add_argument("--hidden", type=int, default=128)
    parser.add_argument("--lr", type=float, default=1e-3)
    parser.add_argument("--seed", type=int, default=0)
    parser.add_argument("--shop", action="store_true", help="train on shop/pack decisions")
    parser.add_argument("--out", default=None)
    args = parser.parse_args()

    if args.out is None:
        args.out = "advisor-shop-policy-v1.onnx" if args.shop else "advisor-policy.onnx"

    torch.manual_seed(args.seed)
    random.seed(args.seed)

    if args.shop:
        features = SHOP_INPUT_FEATURES
        rollout, teacher = load_shop_decisions_split(args.datasets, args.teacher_weight)
        generated_train, validation = split_by_seed(rollout)
        corrections = load_feedback_corrections(
            args.corrections, "shop", args.corrections_weight
        )
        train = build_training_set(generated_train, teacher, corrections)
        enc_label = f"shop encoding v{SHOP_ENCODING_VERSION}"
    else:
        features = INPUT_FEATURES
        generated_train, validation = split_by_seed(load_all(args.datasets))
        human = load_all(args.human, args.human_weight)
        teacher = load_all(args.teacher, args.teacher_weight)
        corrections = load_feedback_corrections(
            args.corrections, "hand", args.corrections_weight, args.min_score_fraction
        )
        train = build_training_set(generated_train, human, teacher, corrections)
        print(
            f"{len(train)} train decisions ({len(human)} human at "
            f"weight {args.human_weight}, {len(teacher)} teacher at "
            f"weight {args.teacher_weight}, {len(corrections)} corrections at "
            f"weight {args.corrections_weight}), {len(validation)} validation decisions"
        )
        enc_label = f"encoding v{ENCODING_VERSION}"

    if not train or not validation:
        sys.exit(f"dataset too small: {len(train)} train / {len(validation)} validation")

    if args.shop:
        print(
            f"{len(train)} train ({len(teacher)} teacher at weight "
            f"{args.teacher_weight}, {len(corrections)} corrections at weight "
            f"{args.corrections_weight}) / {len(validation)} validation shop decisions"
        )

    model = CandidateScorer(features, args.hidden)
    optimizer = torch.optim.Adam(model.parameters(), lr=args.lr)
    for epoch in range(args.epochs):
        random.shuffle(train)
        total = 0.0
        for decision in train:
            optimizer.zero_grad()
            loss = decision_loss(model, decision)
            loss.backward()
            optimizer.step()
            total += float(loss)
        print(
            f"epoch {epoch + 1}: loss={total / len(train):.4f} "
            f"val_acc={accuracy(model, validation):.3f}"
        )

    print(f"final: train_acc={accuracy(model, train):.3f} val_acc={accuracy(model, validation):.3f}")

    model.eval()
    example = torch.zeros((2, features), dtype=torch.float32)
    torch.onnx.export(
        model,
        (example,),
        args.out,
        input_names=["candidates"],
        output_names=["logits"],
        dynamic_axes={"candidates": {0: "n"}, "logits": {0: "n"}},
        opset_version=18,
        external_data=False,
    )
    print(f"exported {args.out} ({enc_label}, {features} features)")


if __name__ == "__main__":
    main()
