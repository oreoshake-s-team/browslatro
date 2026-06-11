import json
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dataset import load_all, load_decisions, split_by_seed

FIXTURE = os.path.join(os.path.dirname(__file__), "fixtures", "sample.jsonl")


def fixture_record():
    with open(FIXTURE, encoding="utf-8") as handle:
        return json.loads(handle.readline())


def write_jsonl(directory, name, records):
    path = os.path.join(directory, name)
    with open(path, "w", encoding="utf-8") as handle:
        handle.write("\n".join(json.dumps(record) for record in records))
    return path


class LoadAllTest(unittest.TestCase):
    def test_concatenates_decisions_across_files(self):
        record = fixture_record()
        with tempfile.TemporaryDirectory() as directory:
            generated = write_jsonl(directory, "generated.jsonl", [record])
            human = write_jsonl(directory, "human-play.jsonl", [record, record])
            self.assertEqual(len(load_all([generated, human])), 3)

    def test_single_file_matches_load_decisions(self):
        self.assertEqual(
            len(load_all([FIXTURE])), len(load_decisions(FIXTURE))
        )

    def test_skips_decisions_the_expert_did_not_offer(self):
        record = dict(fixture_record(), chosenIndex=-1)
        with tempfile.TemporaryDirectory() as directory:
            path = write_jsonl(directory, "skipped.jsonl", [record])
            self.assertEqual(load_all([path]), [])

    def test_rejects_an_unknown_schema_version(self):
        record = dict(fixture_record(), schemaVersion=2)
        with tempfile.TemporaryDirectory() as directory:
            path = write_jsonl(directory, "future.jsonl", [record])
            with self.assertRaises(ValueError):
                load_all([path])

    def test_tolerates_blank_lines(self):
        record = fixture_record()
        with tempfile.TemporaryDirectory() as directory:
            path = os.path.join(directory, "padded.jsonl")
            with open(path, "w", encoding="utf-8") as handle:
                handle.write("\n" + json.dumps(record) + "\n\n")
            self.assertEqual(len(load_all([path])), 1)


class WeightTest(unittest.TestCase):
    def test_decisions_default_to_weight_one(self):
        for _, _, _, weight in load_decisions(FIXTURE):
            self.assertEqual(weight, 1.0)

    def test_load_all_applies_the_given_weight(self):
        for _, _, _, weight in load_all([FIXTURE], weight=5.0):
            self.assertEqual(weight, 5.0)

    def test_split_preserves_weights(self):
        decisions = [([[0.0]], 0, seed, 3.0) for seed in [1, 1, 2, 2, 3, 3]]
        train, validation = split_by_seed(decisions, validation_fraction=0.34)
        weights = {w for _, _, w in train + validation}
        self.assertEqual(weights, {3.0})


if __name__ == "__main__":
    unittest.main()
