import json
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dataset import build_training_set, load_feedback_corrections

FIXTURE = os.path.join(os.path.dirname(__file__), "fixtures", "sample.jsonl")


def hand_record():
    with open(FIXTURE, encoding="utf-8") as handle:
        return json.loads(handle.readline())


def write_jsonl(directory, name, records):
    path = os.path.join(directory, name)
    with open(path, "w", encoding="utf-8") as handle:
        handle.write("\n".join(json.dumps(record) for record in records))
    return path


def hand_correction(correctedIndex=0):
    rec = hand_record()
    return {
        "schemaVersion": 3,
        "kind": "advice-feedback",
        "runSeed": rec["runSeed"],
        "ante": rec["ante"],
        "round": 1,
        "blind": rec["blind"],
        "money": 5,
        "advisorKind": "policy",
        "model": "advisor-policy-v8",
        "recommendationIndex": 1,
        "alternativeIndex": None,
        "verdict": "bad",
        "correctedIndex": correctedIndex,
        "source": "explicit",
        "decision": {
            "context": "hand",
            "state": rec["state"],
            "candidates": rec["candidates"],
        },
    }


class TrainCompositionTest(unittest.TestCase):
    """Covers the dataset composition train.py runs for --corrections."""

    def test_corrections_join_the_training_set(self):
        with tempfile.TemporaryDirectory() as directory:
            path = write_jsonl(directory, "fb.jsonl", [hand_correction(0)])
            corrections = load_feedback_corrections([path], "hand")
            train = build_training_set([], corrections)
            self.assertEqual(len(train), 1)

    def test_corrections_keep_their_weight_in_the_training_set(self):
        with tempfile.TemporaryDirectory() as directory:
            path = write_jsonl(directory, "fb.jsonl", [hand_correction(0)])
            corrections = load_feedback_corrections([path], "hand", weight=7.0)
            train = build_training_set([], corrections)
            _, _, weight = train[0]
            self.assertEqual(weight, 7.0)

    def test_corrections_keep_the_corrected_label(self):
        with tempfile.TemporaryDirectory() as directory:
            path = write_jsonl(directory, "fb.jsonl", [hand_correction(0)])
            corrections = load_feedback_corrections([path], "hand")
            train = build_training_set([], corrections)
            _, chosen, _ = train[0]
            self.assertEqual(chosen, 0)


if __name__ == "__main__":
    unittest.main()
