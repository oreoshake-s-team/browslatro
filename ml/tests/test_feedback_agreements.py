import json
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dataset import load_feedback_agreements, load_feedback_corrections
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


def hand_agreement(source="explicit", verdict="good"):
    rec = hand_record()
    return {
        "schemaVersion": 4,
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
        "verdict": verdict,
        "correctedIndex": rec["chosenIndex"],
        "source": source,
        "decision": {
            "context": "hand",
            "state": rec["state"],
            "candidates": rec["candidates"],
        },
    }


def shop_agreement(source="explicit", verdict="good"):
    return {
        "schemaVersion": 4,
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
        "verdict": verdict,
        "correctedIndex": 0,
        "source": source,
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


class HandAgreementTest(unittest.TestCase):
    def test_re_encodes_an_explicit_hand_agreement(self):
        with tempfile.TemporaryDirectory() as directory:
            path = write_jsonl(directory, "fb.jsonl", [hand_agreement()])
            self.assertEqual(len(load_feedback_agreements([path], "hand")), 1)

    def test_uses_the_recommendation_index_as_the_label(self):
        with tempfile.TemporaryDirectory() as directory:
            path = write_jsonl(directory, "fb.jsonl", [hand_agreement()])
            _, chosen, _, _ = load_feedback_agreements([path], "hand")[0]
            self.assertEqual(chosen, hand_record()["chosenIndex"])

    def test_applies_the_given_weight(self):
        with tempfile.TemporaryDirectory() as directory:
            path = write_jsonl(directory, "fb.jsonl", [hand_agreement()])
            _, _, _, weight = load_feedback_agreements([path], "hand", 2.0)[0]
            self.assertEqual(weight, 2.0)


class ShopAgreementTest(unittest.TestCase):
    def test_re_encodes_an_explicit_shop_agreement(self):
        with tempfile.TemporaryDirectory() as directory:
            path = write_jsonl(directory, "fb.jsonl", [shop_agreement()])
            self.assertEqual(len(load_feedback_agreements([path], "shop")), 1)

    def test_uses_the_recommendation_index_as_the_label(self):
        with tempfile.TemporaryDirectory() as directory:
            path = write_jsonl(directory, "fb.jsonl", [shop_agreement()])
            _, chosen, _, _ = load_feedback_agreements([path], "shop")[0]
            self.assertEqual(chosen, 0)

    def test_encodes_shop_input_features_per_candidate(self):
        with tempfile.TemporaryDirectory() as directory:
            path = write_jsonl(directory, "fb.jsonl", [shop_agreement()])
            inputs, _, _, _ = load_feedback_agreements([path], "shop")[0]
            self.assertTrue(all(len(v) == SHOP_INPUT_FEATURES for v in inputs))


class AgreementFilteringTest(unittest.TestCase):
    def test_skips_implicit_auto_agreement(self):
        with tempfile.TemporaryDirectory() as directory:
            path = write_jsonl(
                directory, "fb.jsonl", [hand_agreement(source="auto-agreement")]
            )
            self.assertEqual(load_feedback_agreements([path], "hand"), [])

    def test_skips_bad_verdict_records(self):
        with tempfile.TemporaryDirectory() as directory:
            path = write_jsonl(directory, "fb.jsonl", [hand_agreement(verdict="bad")])
            self.assertEqual(load_feedback_agreements([path], "hand"), [])

    def test_skips_the_other_context(self):
        with tempfile.TemporaryDirectory() as directory:
            path = write_jsonl(directory, "fb.jsonl", [shop_agreement()])
            self.assertEqual(load_feedback_agreements([path], "hand"), [])


class AgreementCorrectionSeparationTest(unittest.TestCase):
    def test_corrections_ignore_good_verdict_records(self):
        with tempfile.TemporaryDirectory() as directory:
            path = write_jsonl(directory, "fb.jsonl", [hand_agreement()])
            self.assertEqual(load_feedback_corrections([path], "hand"), [])


class FeedbackSchemaVersionTest(unittest.TestCase):
    def test_raises_on_unsupported_feedback_schema_version(self):
        record = hand_agreement()
        record["schemaVersion"] = 99
        with tempfile.TemporaryDirectory() as directory:
            path = write_jsonl(directory, "fb.jsonl", [record])
            with self.assertRaises(ValueError):
                load_feedback_agreements([path], "hand")

    def test_loads_a_v3_record_for_back_compat(self):
        record = hand_agreement()
        record["schemaVersion"] = 3
        with tempfile.TemporaryDirectory() as directory:
            path = write_jsonl(directory, "fb.jsonl", [record])
            self.assertEqual(len(load_feedback_agreements([path], "hand")), 1)


if __name__ == "__main__":
    unittest.main()
