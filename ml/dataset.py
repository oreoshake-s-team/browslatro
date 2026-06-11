"""JSONL dataset loading for the advisor policy network."""

import json

from encoding import encode_decision

DATASET_SCHEMA_VERSION = 1


def load_decisions(path, weight=1.0):
    """Loads a JSONL file into (candidate_vectors, chosen_index) decisions.

    Skips records where the expert's action was not among the offered
    candidates (chosenIndex == -1).
    """
    decisions = []
    with open(path, encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, start=1):
            line = line.strip()
            if not line:
                continue
            record = json.loads(line)
            version = record["schemaVersion"]
            if version != DATASET_SCHEMA_VERSION:
                raise ValueError(
                    f"{path}:{line_number}: schemaVersion {version}, "
                    f"expected {DATASET_SCHEMA_VERSION}"
                )
            inputs, chosen = encode_decision(record)
            if chosen < 0 or not inputs:
                continue
            decisions.append((inputs, chosen, record["runSeed"], weight))
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
