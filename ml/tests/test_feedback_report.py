import json
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from feedback_report import (
    count_context_decisions,
    format_report,
    load_feedback_events,
    summarize_feedback,
)


def write_jsonl(directory, name, records):
    path = os.path.join(directory, name)
    with open(path, "w", encoding="utf-8") as handle:
        handle.write("\n".join(json.dumps(record) for record in records))
    return path


def feedback(advisor="policy", context="hand", correctedIndex=1):
    return {
        "schemaVersion": 3,
        "kind": "advice-feedback",
        "runSeed": 7,
        "ante": 1,
        "round": 3,
        "blind": 0,
        "money": 8,
        "advisorKind": advisor,
        "model": "advisor-policy-v8",
        "recommendationIndex": 0,
        "alternativeIndex": None,
        "verdict": "bad",
        "correctedIndex": correctedIndex,
        "source": "explicit",
        "decision": {"context": context, "state": {}, "candidates": []},
    }


def shop_purchase():
    return {"schemaVersion": 3, "kind": "purchase", "runSeed": 7}


class LoadFeedbackEventsTest(unittest.TestCase):
    def test_keeps_only_advice_feedback_records(self):
        with tempfile.TemporaryDirectory() as directory:
            path = write_jsonl(
                directory, "mixed.jsonl", [feedback(), shop_purchase()]
            )
            self.assertEqual(len(load_feedback_events([path])), 1)

    def test_returns_empty_for_a_log_without_feedback(self):
        with tempfile.TemporaryDirectory() as directory:
            path = write_jsonl(directory, "shop.jsonl", [shop_purchase()])
            self.assertEqual(load_feedback_events([path]), [])


class SummarizeFeedbackTest(unittest.TestCase):
    def test_counts_downvotes_per_advisor_and_context(self):
        events = [feedback(advisor="policy", context="shop")]
        summary = summarize_feedback(events)
        self.assertEqual(summary[("policy", "shop")]["downvotes"], 1)

    def test_splits_corrected_from_bare_downvotes(self):
        events = [
            feedback(correctedIndex=2),
            feedback(correctedIndex=None),
        ]
        summary = summarize_feedback(events)
        self.assertEqual(
            (summary[("policy", "hand")]["corrected"], summary[("policy", "hand")]["bare"]),
            (1, 1),
        )

    def test_separates_policy_from_llm(self):
        events = [feedback(advisor="policy"), feedback(advisor="llm")]
        summary = summarize_feedback(events)
        self.assertIn(("llm", "hand"), summary)

    def test_empty_events_yield_empty_summary(self):
        self.assertEqual(summarize_feedback([]), {})


class CountContextDecisionsTest(unittest.TestCase):
    def test_counts_shop_decisions_but_not_feedback(self):
        with tempfile.TemporaryDirectory() as directory:
            path = write_jsonl(
                directory,
                "mixed.jsonl",
                [shop_purchase(), shop_purchase(), feedback(context="shop")],
            )
            self.assertEqual(count_context_decisions([path])["shop"], 2)

    def test_maps_bare_hand_records_to_hand_context(self):
        with tempfile.TemporaryDirectory() as directory:
            path = write_jsonl(directory, "hand.jsonl", [{"schemaVersion": 1}])
            self.assertEqual(count_context_decisions([path])["hand"], 1)


class FormatReportTest(unittest.TestCase):
    def test_reports_no_events_message(self):
        self.assertEqual(format_report({}, {}), "No advice-feedback events found.")

    def test_includes_the_context_in_the_table(self):
        summary = summarize_feedback([feedback(context="shop")])
        self.assertIn("shop", format_report(summary, {"shop": 10}))


if __name__ == "__main__":
    unittest.main()
