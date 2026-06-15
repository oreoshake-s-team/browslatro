import json
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from evaluate_real_play import (
    agreement,
    chance_agreement,
    load_hand_eval_decisions,
    load_shop_eval_decisions,
)

FIXTURE = os.path.join(os.path.dirname(__file__), "fixtures", "sample.jsonl")


def top0(inputs):
    return [len(inputs) - i for i in range(len(inputs))]


DECISIONS = [
    ([[0.0], [0.0], [0.0]], 0, "purchase"),
    ([[0.0], [0.0]], 1, "purchase"),
    ([[0.0], [0.0], [0.0], [0.0]], 0, "pack-pick"),
]


def write_jsonl(directory, name, records):
    path = os.path.join(directory, name)
    with open(path, "w", encoding="utf-8") as handle:
        handle.write("\n".join(json.dumps(record) for record in records))
    return path


def shop_record(**kwargs):
    base = {
        "schemaVersion": 2,
        "kind": "purchase",
        "runSeed": 42,
        "ante": 1,
        "round": 3,
        "blind": 0,
        "money": 8,
        "item": {"itemType": "joker", "id": "jolly", "name": "Jolly Joker", "cost": 5},
        "offers": [{"itemType": "joker", "id": "jolly", "name": "Jolly Joker", "cost": 5}],
    }
    base.update(kwargs)
    return base


class AgreementTest(unittest.TestCase):
    def test_overall_rate_counts_argmax_hits(self):
        self.assertAlmostEqual(agreement(DECISIONS, top0)["overall"], 2 / 3)

    def test_splits_agreement_by_kind(self):
        self.assertEqual(agreement(DECISIONS, top0)["by_kind"]["purchase"], (1, 2))

    def test_pack_pick_kind_counted(self):
        self.assertEqual(agreement(DECISIONS, top0)["by_kind"]["pack-pick"], (1, 1))

    def test_empty_decisions_report_zero(self):
        self.assertEqual(agreement([], top0)["n"], 0)


class ChanceAgreementTest(unittest.TestCase):
    def test_is_mean_inverse_candidate_count(self):
        self.assertAlmostEqual(chance_agreement(DECISIONS), (1 / 3 + 1 / 2 + 1 / 4) / 3)

    def test_empty_is_zero(self):
        self.assertEqual(chance_agreement([]), 0.0)


class LoadShopEvalDecisionsTest(unittest.TestCase):
    def test_loads_a_shop_decision_with_its_kind(self):
        with tempfile.TemporaryDirectory() as directory:
            path = write_jsonl(directory, "human.jsonl", [shop_record()])
            decisions = load_shop_eval_decisions([path])
            self.assertEqual(decisions[0][2], "purchase")

    def test_skips_non_shop_records(self):
        non_shop = dict(shop_record(), kind="consumable-use")
        with tempfile.TemporaryDirectory() as directory:
            path = write_jsonl(directory, "human.jsonl", [non_shop])
            self.assertEqual(load_shop_eval_decisions([path]), [])


class LoadHandEvalDecisionsTest(unittest.TestCase):
    def test_loads_at_least_one_decision(self):
        self.assertGreater(len(load_hand_eval_decisions([FIXTURE])), 0)

    def test_tags_decisions_by_play_or_discard(self):
        kinds = {kind for _, _, kind in load_hand_eval_decisions([FIXTURE])}
        self.assertTrue(kinds <= {"play", "discard"})

    def test_skips_shop_run_events(self):
        with tempfile.TemporaryDirectory() as directory:
            path = write_jsonl(directory, "shop.jsonl", [shop_record()])
            self.assertEqual(load_hand_eval_decisions([path]), [])


if __name__ == "__main__":
    unittest.main()
