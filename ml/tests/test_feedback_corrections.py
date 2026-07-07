import json
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dataset import load_feedback_corrections
from encoding import SHOP_INPUT_FEATURES, SHOP_INPUT_FEATURES_V2

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


def sell_candidate():
    return {
        "action": "sell",
        "item": {
            "itemType": "joker",
            "category": "joker-x-mult",
            "id": "sell:blueprint:0",
            "name": "Blueprint",
            "description": "",
            "cost": -5,
        },
    }


def use_candidate():
    return {
        "action": "use",
        "item": {
            "itemType": "planet",
            "category": "planet",
            "id": "mars",
            "name": "Mars",
            "description": "",
            "cost": 0,
        },
    }


def correction_with_candidates(candidates, correctedIndex=0):
    record = shop_correction(correctedIndex)
    record["decision"]["candidates"] = candidates
    return record


def rollout_fixture(deck=None, jokers=None):
    return {
        "handStats": {},
        "jokers": jokers if jokers is not None else [],
        "deck": deck if deck is not None else [],
        "offers": [],
    }


def shop_inputs(record, v2=False):
    with tempfile.TemporaryDirectory() as directory:
        path = write_jsonl(directory, "fb.jsonl", [record])
        return load_feedback_corrections([path], "shop", v2=v2)[0][0]


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


class CandidateActionEncodingTest(unittest.TestCase):
    def test_sell_candidates_encode_as_item_rows_not_leave(self):
        inputs = shop_inputs(
            correction_with_candidates([sell_candidate(), {"action": "leave"}])
        )
        self.assertNotEqual(inputs[0], inputs[1])

    def test_v2_use_candidates_encode_as_item_rows_not_leave(self):
        inputs = shop_inputs(
            correction_with_candidates([use_candidate(), {"action": "leave"}]),
            v2=True,
        )
        self.assertNotEqual(inputs[0][:-1], inputs[1][:-1])

    def test_v2_use_candidates_carry_the_use_flag(self):
        inputs = shop_inputs(
            correction_with_candidates([use_candidate(), {"action": "leave"}]),
            v2=True,
        )
        self.assertEqual([row[-1] for row in inputs], [1.0, 0.0])

    def test_v2_sell_candidates_do_not_carry_the_use_flag(self):
        inputs = shop_inputs(
            correction_with_candidates([sell_candidate(), {"action": "leave"}]),
            v2=True,
        )
        self.assertEqual([row[-1] for row in inputs], [0.0, 0.0])

    def test_v1_use_candidates_stay_leave_shaped_to_match_the_v1_runtime(self):
        inputs = shop_inputs(
            correction_with_candidates([use_candidate(), {"action": "leave"}])
        )
        self.assertEqual(inputs[0], inputs[1])

    def test_v2_rows_stay_runtime_width(self):
        inputs = shop_inputs(
            correction_with_candidates(
                [sell_candidate(), use_candidate(), {"action": "leave"}]
            ),
            v2=True,
        )
        self.assertTrue(all(len(row) == SHOP_INPUT_FEATURES_V2 for row in inputs))


class RolloutBuildContextTest(unittest.TestCase):
    def test_rollout_deck_enhancements_change_the_encoded_context(self):
        with_deck = shop_correction(1)
        with_deck["decision"]["rollout"] = rollout_fixture(
            deck=[{"id": 1, "rank": "A", "suit": "spades", "enhancement": "steel"}]
        )
        without = shop_correction(1)
        without["decision"]["rollout"] = rollout_fixture()
        self.assertNotEqual(shop_inputs(with_deck), shop_inputs(without))

    def test_unenhanced_rollout_deck_matches_the_empty_build(self):
        plain_deck = shop_correction(1)
        plain_deck["decision"]["rollout"] = rollout_fixture(
            deck=[{"id": 1, "rank": "A", "suit": "spades", "enhancement": None}]
        )
        without = shop_correction(1)
        without["decision"]["rollout"] = rollout_fixture()
        self.assertEqual(shop_inputs(plain_deck), shop_inputs(without))

    def test_rollout_jokers_change_the_encoded_context(self):
        with_jokers = shop_correction(1)
        with_jokers["decision"]["rollout"] = rollout_fixture(
            jokers=[{"effect": {"kind": "flat-mult", "amount": 4}, "rarity": "common"}]
        )
        without = shop_correction(1)
        without["decision"]["rollout"] = rollout_fixture()
        self.assertNotEqual(shop_inputs(with_jokers), shop_inputs(without))

    def test_records_without_rollout_still_encode(self):
        self.assertEqual(len(shop_inputs(shop_correction(1))), 3)


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
