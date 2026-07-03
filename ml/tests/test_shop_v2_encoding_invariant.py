"""Guards the "human data must always be importable" invariant.

Every shop human-data channel (shop decisions, advice-feedback corrections,
advice-feedback agreements) must be able to encode into the CURRENT runtime
shop encoding (v2 / use-aware, ``SHOP_INPUT_FEATURES_V2``). If a future encoder
bump forgets one of these channels, these tests fail loudly instead of silently
stranding human play on a dead encoding.
"""

import json
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dataset import (
    load_feedback_agreements,
    load_feedback_corrections,
    load_shop_decisions,
)
from encoding import SHOP_INPUT_FEATURES, SHOP_INPUT_FEATURES_V2


def write_jsonl(directory, records):
    path = os.path.join(directory, "shop.jsonl")
    with open(path, "w", encoding="utf-8") as handle:
        handle.write("\n".join(json.dumps(record) for record in records))
    return path


def shop_purchase():
    return {
        "schemaVersion": 4,
        "kind": "purchase",
        "runSeed": 11,
        "ante": 2,
        "round": 3,
        "blind": 0,
        "money": 12,
        "item": {"itemType": "joker", "id": "blueprint", "cost": 10},
        "offers": [
            {"itemType": "joker", "id": "blueprint", "cost": 10, "category": "joker-x-mult"},
            {"itemType": "planet", "id": "jupiter", "cost": 3, "category": "planet"},
        ],
    }


def _shop_decision():
    return {
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
            {"action": "buy", "item": {"itemType": "joker", "category": "joker-x-mult", "id": "blueprint", "cost": 10}},
            {"action": "reroll", "cost": 5},
            {"action": "leave"},
        ],
    }


def shop_correction():
    return {
        "schemaVersion": 4,
        "kind": "advice-feedback",
        "runSeed": 7,
        "ante": 2,
        "round": 3,
        "blind": 0,
        "money": 8,
        "advisorKind": "policy",
        "model": "advisor-shop-policy-v15",
        "recommendationIndex": 0,
        "alternativeIndex": None,
        "verdict": "bad",
        "correctedIndex": 1,
        "source": "explicit",
        "decision": _shop_decision(),
    }


def shop_agreement():
    return {
        **shop_correction(),
        "verdict": "good",
        "correctedIndex": None,
        "recommendationIndex": 0,
        "source": "explicit",
    }


def _dims(decisions):
    return sorted({len(row) for inputs, _chosen, _seed, _weight in decisions for row in inputs})


class ShopDecisionsEncodingInvariant(unittest.TestCase):
    def test_v2_shop_decisions_match_the_runtime_encoding(self):
        with tempfile.TemporaryDirectory() as directory:
            path = write_jsonl(directory, [shop_purchase()])
            self.assertEqual(_dims(load_shop_decisions(path, v2=True)), [SHOP_INPUT_FEATURES_V2])

    def test_v1_shop_decisions_stay_v1(self):
        with tempfile.TemporaryDirectory() as directory:
            path = write_jsonl(directory, [shop_purchase()])
            self.assertEqual(_dims(load_shop_decisions(path, v2=False)), [SHOP_INPUT_FEATURES])


class ShopCorrectionsEncodingInvariant(unittest.TestCase):
    def test_v2_shop_corrections_match_the_runtime_encoding(self):
        with tempfile.TemporaryDirectory() as directory:
            path = write_jsonl(directory, [shop_correction()])
            self.assertEqual(
                _dims(load_feedback_corrections([path], "shop", v2=True)),
                [SHOP_INPUT_FEATURES_V2],
            )

    def test_v1_shop_corrections_stay_v1(self):
        with tempfile.TemporaryDirectory() as directory:
            path = write_jsonl(directory, [shop_correction()])
            self.assertEqual(
                _dims(load_feedback_corrections([path], "shop", v2=False)),
                [SHOP_INPUT_FEATURES],
            )


class ShopAgreementsEncodingInvariant(unittest.TestCase):
    def test_v2_shop_agreements_match_the_runtime_encoding(self):
        with tempfile.TemporaryDirectory() as directory:
            path = write_jsonl(directory, [shop_agreement()])
            self.assertEqual(
                _dims(load_feedback_agreements([path], "shop", v2=True)),
                [SHOP_INPUT_FEATURES_V2],
            )


class RuntimeEncodingWidth(unittest.TestCase):
    def test_v2_is_exactly_one_use_flag_wider_than_v1(self):
        self.assertEqual(SHOP_INPUT_FEATURES_V2, SHOP_INPUT_FEATURES + 1)


if __name__ == "__main__":
    unittest.main()
