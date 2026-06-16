import json
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dataset import load_feedback_corrections
from encoding import SHOP_INPUT_FEATURES

FIXTURE = os.path.join(os.path.dirname(__file__), "fixtures", "sample.jsonl")


def hand_record():
    with open(FIXTURE, encoding="utf-8") as handle:
        return json.loads(handle.readline())


def write_jsonl(directory, name, records):
    path = os.path.join(directory, name)
    with open(path, "w", encoding="utf-8") as handle:
        handle.write("\n".join(json.dumps(record) for record in records))
    return path


def hand_correction(correctedIndex=1):
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
        "recommendationIndex": rec["chosenIndex"],
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


def shop_correction(correctedIndex=1):
    return {
        "schemaVersion": 3,
        "kind": "advice-feedback",
        "runSeed": 7,
        "ante": 2,
        "round": 3,
        "blind": 0,
        "money": 8,
        "advisorKind": "policy",
        "model": "advisor-shop-policy-v2",
        "recommendationIndex": 0,
        "alternativeIndex": None,
        "verdict": "bad",
        "correctedIndex": correctedIndex,
        "source": "auto-disagreement",
        "decision": {
            "context": "shop",
            "state": {
                "money": 8,
                "ante": 2,
                "jokers": [],
                "jokerCapacity": 5,
                "consumables": [],
                "consumableCapacity": 2,
                "ownedVoucherIds": [],
            },
            "candidates": [
                {
                    "action": "buy",
                    "item": {
                        "itemType": "joker",
                        "category": "joker-x-mult",
                        "id": "blueprint",
                        "name": "Blueprint",
                        "description": "",
                        "cost": 10,
                    },
                },
                {"action": "reroll", "cost": 5},
                {"action": "leave"},
            ],
        },
    }


class HandCorrectionTest(unittest.TestCase):
    def test_re_encodes_a_hand_correction(self):
        with tempfile.TemporaryDirectory() as directory:
            path = write_jsonl(directory, "fb.jsonl", [hand_correction(2)])
            self.assertEqual(len(load_feedback_corrections([path], "hand")), 1)

    def test_uses_the_corrected_index_as_the_label(self):
        with tempfile.TemporaryDirectory() as directory:
            path = write_jsonl(directory, "fb.jsonl", [hand_correction(2)])
            _, chosen, _, _ = load_feedback_corrections([path], "hand")[0]
            self.assertEqual(chosen, 2)

    def test_encodes_one_vector_per_candidate(self):
        with tempfile.TemporaryDirectory() as directory:
            path = write_jsonl(directory, "fb.jsonl", [hand_correction(2)])
            inputs, _, _, _ = load_feedback_corrections([path], "hand")[0]
            self.assertEqual(len(inputs), len(hand_record()["candidates"]))

    def test_applies_the_given_weight(self):
        with tempfile.TemporaryDirectory() as directory:
            path = write_jsonl(directory, "fb.jsonl", [hand_correction(2)])
            _, _, _, weight = load_feedback_corrections([path], "hand", 5.0)[0]
            self.assertEqual(weight, 5.0)


class ShopCorrectionTest(unittest.TestCase):
    def test_re_encodes_a_shop_correction(self):
        with tempfile.TemporaryDirectory() as directory:
            path = write_jsonl(directory, "fb.jsonl", [shop_correction(1)])
            self.assertEqual(len(load_feedback_corrections([path], "shop")), 1)

    def test_uses_the_corrected_index_as_the_label(self):
        with tempfile.TemporaryDirectory() as directory:
            path = write_jsonl(directory, "fb.jsonl", [shop_correction(1)])
            _, chosen, _, _ = load_feedback_corrections([path], "shop")[0]
            self.assertEqual(chosen, 1)

    def test_encodes_shop_input_features_per_candidate(self):
        with tempfile.TemporaryDirectory() as directory:
            path = write_jsonl(directory, "fb.jsonl", [shop_correction(1)])
            inputs, _, _, _ = load_feedback_corrections([path], "shop")[0]
            self.assertTrue(all(len(v) == SHOP_INPUT_FEATURES for v in inputs))


class FilteringTest(unittest.TestCase):
    def test_skips_bare_downvotes(self):
        with tempfile.TemporaryDirectory() as directory:
            path = write_jsonl(directory, "fb.jsonl", [hand_correction(None)])
            self.assertEqual(load_feedback_corrections([path], "hand"), [])

    def test_skips_the_other_context(self):
        with tempfile.TemporaryDirectory() as directory:
            path = write_jsonl(directory, "fb.jsonl", [shop_correction(1)])
            self.assertEqual(load_feedback_corrections([path], "hand"), [])

    def test_skips_non_feedback_records(self):
        with tempfile.TemporaryDirectory() as directory:
            path = write_jsonl(
                directory, "mixed.jsonl", [{"kind": "purchase", "runSeed": 1}]
            )
            self.assertEqual(load_feedback_corrections([path], "shop"), [])


if __name__ == "__main__":
    unittest.main()
