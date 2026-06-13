"""JSONL dataset loading for the advisor policy network."""

import json
import sys

from encoding import HAND_SLOTS, encode_decision, encode_shop_decision

DATASET_SCHEMA_VERSION = 1
SHOP_SCHEMA_VERSION = 2

_SHOP_KINDS = frozenset({"purchase", "reroll", "pack-pick"})


def load_decisions(path, weight=1.0):
    """Loads a JSONL file into (candidate_vectors, chosen_index) decisions.

    Skips records where the expert's action was not among the offered
    candidates (chosenIndex == -1), and decisions the fixed-size encoding
    cannot represent (hands wider than HAND_SLOTS, from hand-size jokers
    and vouchers in human play).
    """
    decisions = []
    unencodable = 0
    with open(path, encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, start=1):
            line = line.strip()
            if not line:
                continue
            record = json.loads(line)
            if record.get("kind") is not None:
                continue
            version = record["schemaVersion"]
            if version != DATASET_SCHEMA_VERSION:
                raise ValueError(
                    f"{path}:{line_number}: schemaVersion {version}, "
                    f"expected {DATASET_SCHEMA_VERSION}"
                )
            if len(record["state"]["hand"]) > HAND_SLOTS:
                unencodable += 1
                continue
            inputs, chosen = encode_decision(record)
            if chosen < 0 or not inputs:
                continue
            decisions.append((inputs, chosen, record["runSeed"], weight))
    if unencodable:
        print(
            f"{path}: skipped {unencodable} decision(s) with hands wider "
            f"than {HAND_SLOTS} slots",
            file=sys.stderr,
        )
    return decisions


def load_all(paths, weight=1.0):
    """Concatenates decisions from several JSONL files.

    Lets the generated expert dataset and in-game human-play exports train
    together: each file is validated independently by load_decisions, and
    every decision carries the given training weight.
    """
    return [
        decision for path in paths for decision in load_decisions(path, weight)
    ]


def load_shop_decisions(path, weight=1.0):
    """Loads shop/pack decisions from a JSONL file of schema-v2 RunEventRecords.

    Handles purchase, reroll, and pack-pick kinds. Skips unrecognised kinds and
    records where encoding produces no candidates or an invalid chosen index.
    """
    decisions = []
    with open(path, encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, start=1):
            line = line.strip()
            if not line:
                continue
            record = json.loads(line)
            if record.get("kind") not in _SHOP_KINDS:
                continue
            version = record["schemaVersion"]
            if version != SHOP_SCHEMA_VERSION:
                raise ValueError(
                    f"{path}:{line_number}: schemaVersion {version}, "
                    f"expected {SHOP_SCHEMA_VERSION}"
                )
            inputs, chosen = encode_shop_decision(record)
            if chosen < 0 or not inputs:
                continue
            decisions.append((inputs, chosen, record["runSeed"], weight))
    return decisions


def build_training_set(train, *extra_sources):
    """Appends extra decision sources to the generated training split.

    The generated split from split_by_seed is already (inputs, chosen, weight)
    tuples. Each extra source — in-game human play, distilled LLM teacher
    labels — is a list of (inputs, chosen, seed, weight) tuples from load_all;
    the seed is dropped here so these decisions always train and are never held
    out for validation. Sources are independent: pass each at its own weight.
    """
    combined = list(train)
    for source in extra_sources:
        combined.extend(
            (inputs, chosen, weight) for inputs, chosen, _, weight in source
        )
    return combined


def split_by_seed(decisions, validation_fraction=0.2):
    """Deterministic train/validation split keyed on the run seed.

    Splitting by seed keeps all decisions from one game on the same side,
    preventing leakage between nearly-identical consecutive states.
    """
    if not 0 < validation_fraction < 1:
        raise ValueError(f"validation_fraction must be in (0, 1), got {validation_fraction}")
    seeds = sorted({seed for _, _, seed, _ in decisions})
    holdout = max(1, int(len(seeds) * validation_fraction)) if seeds else 0
    validation_seeds = set(seeds[-holdout:]) if holdout else set()
    train = [(i, c, w) for i, c, s, w in decisions if s not in validation_seeds]
    validation = [(i, c, w) for i, c, s, w in decisions if s in validation_seeds]
    return train, validation
