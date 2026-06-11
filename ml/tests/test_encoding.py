import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dataset import load_decisions, split_by_seed
from encoding import (
    CANDIDATE_FEATURES,
    CARD_FEATURES,
    INPUT_FEATURES,
    STATE_FEATURES,
    encode_candidate,
    encode_decision,
    encode_state,
)

FIXTURE = os.path.join(os.path.dirname(__file__), "fixtures", "sample.jsonl")


def card(card_id, rank, suit, **extra):
    base = {
        "id": card_id,
        "faceDown": False,
        "rank": rank,
        "suit": suit,
        "enhancement": None,
        "seal": None,
        "edition": None,
        "bonusChips": 0,
    }
    base.update(extra)
    return base


def state(hand, **extra):
    base = {
        "hand": hand,
        "jokers": [],
        "blind": {"kind": "small", "name": "Small Blind", "scoreTarget": 300, "boss": None},
        "ante": 1,
        "round": 1,
        "money": 4,
        "remainingHands": 4,
        "remainingDiscards": 3,
        "roundScore": 0,
        "deck": {
            "total": 2,
            "bySuit": {"spades": 1, "hearts": 1, "diamonds": 0, "clubs": 0},
            "byRank": {r: 0 for r in ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"]} | {"A": 2},
        },
    }
    base.update(extra)
    return base


def play_candidate(card_ids, **extra):
    base = {
        "action": "play",
        "cardIds": card_ids,
        "handLabel": "Pair",
        "score": 56,
        "chips": 28,
        "mult": 2,
        "notes": [{"kind": "best-immediate-score"}],
    }
    base.update(extra)
    return base


class EncodeStateTests(unittest.TestCase):
    def test_state_vector_has_the_documented_length(self):
        vector = encode_state(state([card(1, "A", "spades")]))
        self.assertEqual(len(vector), STATE_FEATURES)

    def test_first_slot_marks_rank_and_suit(self):
        vector = encode_state(state([card(1, "2", "spades")]))
        self.assertEqual(vector[:4], [1.0, 0.0, 1.0, 0.0])

    def test_face_down_card_hides_everything_but_presence(self):
        vector = encode_state(state([{"id": 1, "faceDown": True}]))
        self.assertEqual(vector[:CARD_FEATURES], [1.0, 1.0] + [0.0] * (CARD_FEATURES - 2))

    def test_empty_slots_encode_to_zero(self):
        vector = encode_state(state([card(1, "A", "spades")]))
        self.assertEqual(vector[CARD_FEATURES : 2 * CARD_FEATURES], [0.0] * CARD_FEATURES)

    def test_encoding_is_deterministic(self):
        s = state([card(1, "K", "hearts", enhancement="glass", seal="red")])
        self.assertEqual(encode_state(s), encode_state(s))

    def test_unknown_rank_raises(self):
        with self.assertRaises(ValueError):
            encode_state(state([card(1, "1", "spades")]))

    def test_ten_card_hand_fills_the_ninth_and_tenth_slots(self):
        hand = [card(i, "A", "spades") for i in range(10)]
        vector = encode_state(state(hand))
        self.assertEqual([vector[9 * CARD_FEATURES], vector[10 * CARD_FEATURES]], [1.0, 0.0])

    def test_oversized_hand_raises(self):
        hand = [card(i, "A", "spades") for i in range(17)]
        with self.assertRaises(ValueError):
            encode_state(state(hand))


class EncodeCandidateTests(unittest.TestCase):
    def test_candidate_vector_has_the_documented_length(self):
        s = state([card(1, "9", "hearts"), card(2, "9", "spades")])
        vector = encode_candidate(play_candidate([1, 2]), s)
        self.assertEqual(len(vector), CANDIDATE_FEATURES)

    def test_selection_mask_aligns_with_hand_slots(self):
        s = state([card(7, "9", "hearts"), card(8, "9", "spades"), card(9, "2", "clubs")])
        vector = encode_candidate(play_candidate([9]), s)
        self.assertEqual(vector[2:18], [0.0, 0.0, 1.0] + [0.0] * 13)

    def test_discard_candidates_carry_no_score_features(self):
        s = state([card(1, "9", "hearts")])
        discard = {"action": "discard", "cardIds": [1], "notes": [{"kind": "keeps-paired-ranks", "ranks": ["9"]}]}
        vector = encode_candidate(discard, s)
        self.assertEqual(vector[:2], [0.0, 1.0])

    def test_unknown_card_id_raises(self):
        s = state([card(1, "9", "hearts")])
        with self.assertRaises(ValueError):
            encode_candidate(play_candidate([42]), s)


class FixtureTests(unittest.TestCase):
    def test_fixture_decisions_load(self):
        decisions = load_decisions(FIXTURE)
        self.assertGreater(len(decisions), 0)

    def test_all_fixture_inputs_have_the_documented_length(self):
        for inputs, _, _, _ in load_decisions(FIXTURE):
            for vector in inputs:
                self.assertEqual(len(vector), INPUT_FEATURES)

    def test_all_fixture_chosen_indices_are_in_range(self):
        for inputs, chosen, _, _ in load_decisions(FIXTURE):
            self.assertTrue(0 <= chosen < len(inputs))

    def test_encode_decision_matches_state_plus_candidate(self):
        import json

        with open(FIXTURE, encoding="utf-8") as handle:
            record = json.loads(handle.readline())
        inputs, _ = encode_decision(record)
        self.assertEqual(len(inputs[0]), STATE_FEATURES + CANDIDATE_FEATURES)


class SplitTests(unittest.TestCase):
    def test_split_keeps_seeds_disjoint(self):
        decisions = [([[0.0]], 0, seed, 1.0) for seed in [1, 1, 2, 2, 3, 3, 4, 4, 5, 5]]
        train, validation = split_by_seed(decisions, validation_fraction=0.2)
        self.assertEqual(len(train) + len(validation), len(decisions))

    def test_split_rejects_bad_fraction(self):
        with self.assertRaises(ValueError):
            split_by_seed([], validation_fraction=1.5)


if __name__ == "__main__":
    unittest.main()
