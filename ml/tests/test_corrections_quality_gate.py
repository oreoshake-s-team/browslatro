import json
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dataset import (
    DEFAULT_MIN_SCORE_FRACTION,
    _hand_correction_justified,
    load_feedback_corrections,
)

FIXTURE = os.path.join(os.path.dirname(__file__), "fixtures", "sample.jsonl")

PLAYS = [
    {"action": "play", "score": 100},
    {"action": "play", "score": 10},
    {"action": "discard"},
]


def hand_record():
    with open(FIXTURE, encoding="utf-8") as handle:
        return json.loads(handle.readline())


def write_jsonl(directory, name, records):
    path = os.path.join(directory, name)
    with open(path, "w", encoding="utf-8") as handle:
        handle.write("\n".join(json.dumps(record) for record in records))
    return path


def hand_correction(correctedIndex):
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
        "recommendationIndex": 0,
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


class HandCorrectionJustifiedTest(unittest.TestCase):
    def test_passes_a_play_above_the_threshold(self):
        self.assertTrue(_hand_correction_justified(PLAYS, 0, 0.25))

    def test_rejects_a_play_below_the_threshold(self):
        self.assertFalse(_hand_correction_justified(PLAYS, 1, 0.25))

    def test_always_passes_a_discard(self):
        self.assertTrue(_hand_correction_justified(PLAYS, 2, 0.25))

    def test_passes_when_there_is_no_scoring_play(self):
        self.assertTrue(
            _hand_correction_justified([{"action": "play", "score": 0}], 0, 0.25)
        )

    def test_rejects_an_out_of_range_index(self):
        self.assertFalse(_hand_correction_justified(PLAYS, 5, 0.25))


class LoadWithGateTest(unittest.TestCase):
    def test_loads_a_marginal_play_without_a_gate(self):
        with tempfile.TemporaryDirectory() as directory:
            path = write_jsonl(directory, "fb.jsonl", [hand_correction(1)])
            self.assertEqual(len(load_feedback_corrections([path], "hand")), 1)

    def test_gate_drops_a_play_below_the_fraction(self):
        with tempfile.TemporaryDirectory() as directory:
            path = write_jsonl(directory, "fb.jsonl", [hand_correction(1)])
            self.assertEqual(
                load_feedback_corrections([path], "hand", min_score_fraction=0.6), []
            )

    def test_gate_keeps_a_play_above_the_fraction(self):
        with tempfile.TemporaryDirectory() as directory:
            path = write_jsonl(directory, "fb.jsonl", [hand_correction(1)])
            self.assertEqual(
                len(
                    load_feedback_corrections(
                        [path], "hand", min_score_fraction=DEFAULT_MIN_SCORE_FRACTION
                    )
                ),
                1,
            )

    def test_gate_keeps_a_discard_correction(self):
        with tempfile.TemporaryDirectory() as directory:
            path = write_jsonl(directory, "fb.jsonl", [hand_correction(2)])
            self.assertEqual(
                len(load_feedback_corrections([path], "hand", min_score_fraction=1.0)),
                1,
            )


if __name__ == "__main__":
    unittest.main()
