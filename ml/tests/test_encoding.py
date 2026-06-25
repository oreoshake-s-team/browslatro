import json
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dataset import load_decisions, split_by_seed
from encoding import (
    CANDIDATE_FEATURES,
    CARD_FEATURES,
    INPUT_FEATURES,
    JOKER_SLOT_FEATURES,
    JOKER_SLOTS,
    SHOP_CONTEXT_FEATURES,
    SHOP_INPUT_FEATURES,
    SHOP_ITEM_TYPES,
    STATE_FEATURES,
    encode_candidate,
    encode_decision,
    encode_shop_decision,
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
        "stake": "white",
        "deckId": "red-deck",
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

    def test_equipped_joker_sets_presence_flag(self):
        joker = {
            "id": "jolly", "name": "Jolly Joker", "description": "",
            "effectKind": "on-hand-type-mult", "rarity": "common",
            "edition": None, "stickers": [], "counter": None,
        }
        context_bytes = STATE_FEATURES - 16 * CARD_FEATURES - JOKER_SLOTS * JOKER_SLOT_FEATURES
        joker_start = 16 * CARD_FEATURES + context_bytes
        vector = encode_state(state([card(1, "A", "spades")], jokers=[joker]))
        self.assertEqual(vector[joker_start], 1.0)

    def test_empty_joker_slot_encodes_to_zeros(self):
        context_bytes = STATE_FEATURES - 16 * CARD_FEATURES - JOKER_SLOTS * JOKER_SLOT_FEATURES
        joker_start = 16 * CARD_FEATURES + context_bytes
        vector = encode_state(state([card(1, "A", "spades")]))
        self.assertEqual(vector[joker_start:joker_start + JOKER_SLOT_FEATURES], [0.0] * JOKER_SLOT_FEATURES)

    def test_deck_one_hot_marks_active_deck(self):
        cond = 16 * CARD_FEATURES + 27
        vector = encode_state(state([card(1, "A", "spades")], deckId="black-deck"))
        self.assertEqual(vector[cond + 4], 1.0)

    def test_stake_one_hot_marks_active_stake(self):
        cond = 16 * CARD_FEATURES + 27
        vector = encode_state(state([card(1, "A", "spades")], stake="purple"))
        self.assertEqual(vector[cond + 15 + 5], 1.0)

    def test_green_deck_flags_interest_suppression(self):
        derived = 16 * CARD_FEATURES + 27 + 15 + 8
        vector = encode_state(state([card(1, "A", "spades")], deckId="green-deck"))
        self.assertEqual(vector[derived + 4], 1.0)

    def test_unmodified_deck_leaves_derived_scalars_zero(self):
        derived = 16 * CARD_FEATURES + 27 + 15 + 8
        vector = encode_state(state([card(1, "A", "spades")], deckId="yellow-deck"))
        self.assertEqual(vector[derived:derived + 5], [0.0] * 5)

    def test_blue_stake_encodes_discard_penalty(self):
        derived = 16 * CARD_FEATURES + 27 + 15 + 8
        vector = encode_state(state([card(1, "A", "spades")], stake="blue"))
        self.assertEqual(vector[derived + 5], -0.5)

    def test_missing_deck_id_defaults_to_red(self):
        cond = 16 * CARD_FEATURES + 27
        base = state([card(1, "A", "spades")])
        del base["deckId"]
        vector = encode_state(base)
        self.assertEqual(vector[cond], 1.0)


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

    def test_face_down_slots_stay_zero_in_the_selection_mask(self):
        s = state([
            {"id": 7, "faceDown": True},
            card(8, "9", "spades"),
        ])
        vector = encode_candidate(play_candidate([7, 8]), s)
        self.assertEqual(vector[2:18], [0.0, 1.0] + [0.0] * 14)


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


def shop_envelope(**kwargs):
    base = {
        "schemaVersion": 2,
        "runSeed": 1,
        "ante": 2,
        "round": 6,
        "blind": 0,
        "money": 8,
    }
    base.update(kwargs)
    return base


def offer(item_type, item_id, cost):
    return {"itemType": item_type, "id": item_id, "name": item_id, "cost": cost}


def pack_option(option_type, option_id):
    return {"optionType": option_type, "id": option_id, "name": option_id}


class EncodeShopDecisionTests(unittest.TestCase):
    def test_purchase_chosen_index_matches_bought_offer(self):
        record = shop_envelope(
            kind="purchase",
            item=offer("planet", "mercury", 3),
            offers=[offer("joker", "jolly", 5), offer("planet", "mercury", 3)],
        )
        _, chosen = encode_shop_decision(record)
        self.assertEqual(chosen, 1)

    def test_purchase_includes_leave_candidate(self):
        record = shop_envelope(
            kind="purchase",
            item=offer("joker", "jolly", 5),
            offers=[offer("joker", "jolly", 5)],
        )
        candidates, _ = encode_shop_decision(record)
        self.assertEqual(len(candidates), 2)

    def test_purchase_leave_chosen_index_is_leave_candidate(self):
        record = shop_envelope(
            kind="purchase",
            item=None,
            offers=[offer("joker", "jolly", 5), offer("planet", "mercury", 3)],
        )
        _, chosen = encode_shop_decision(record)
        self.assertEqual(chosen, 2)

    def test_owned_jokers_change_context_encoding(self):
        offers = [offer("joker", "jolly", 5)]
        bare, _ = encode_shop_decision(
            shop_envelope(kind="purchase", item=offers[0], offers=offers)
        )
        built, _ = encode_shop_decision(
            shop_envelope(
                kind="purchase",
                item=offers[0],
                offers=offers,
                jokers=[{"effectKind": "additive-mult", "rarity": "common"}],
            )
        )
        self.assertNotEqual(bare[0], built[0])

    def test_reroll_chosen_index_is_reroll_candidate(self):
        record = shop_envelope(
            kind="reroll",
            cost=1,
            offers=[offer("planet", "mercury", 3), offer("joker", "jolly", 5)],
        )
        candidates, chosen = encode_shop_decision(record)
        self.assertEqual(chosen, 2)

    def test_reroll_appends_reroll_and_leave_after_offers(self):
        record = shop_envelope(
            kind="reroll",
            cost=1,
            offers=[offer("planet", "mercury", 3)],
        )
        candidates, _ = encode_shop_decision(record)
        self.assertEqual(len(candidates), 3)

    def test_pack_pick_chosen_index_matches_picked(self):
        record = shop_envelope(
            kind="pack-pick",
            pool="arcana",
            variant="standard",
            options=[pack_option("tarot", "fool"), pack_option("tarot", "magician")],
            pickedIndex=1,
            picksRemaining=1,
        )
        _, chosen = encode_shop_decision(record)
        self.assertEqual(chosen, 1)

    def test_pack_pick_null_maps_to_skip_candidate(self):
        record = shop_envelope(
            kind="pack-pick",
            pool="arcana",
            variant="standard",
            options=[pack_option("tarot", "fool")],
            pickedIndex=None,
            picksRemaining=1,
        )
        candidates, chosen = encode_shop_decision(record)
        self.assertEqual(chosen, len(candidates) - 1)

    def test_candidate_vector_length_matches_shop_input_features(self):
        record = shop_envelope(
            kind="purchase",
            item=offer("joker", "jolly", 5),
            offers=[offer("joker", "jolly", 5)],
        )
        candidates, _ = encode_shop_decision(record)
        self.assertEqual(len(candidates[0]), SHOP_INPUT_FEATURES)

    def test_unknown_kind_returns_empty_and_negative_chosen(self):
        record = shop_envelope(kind="consumable-use")
        candidates, chosen = encode_shop_decision(record)
        self.assertEqual(candidates, [])
        self.assertEqual(chosen, -1)

    def test_can_afford_set_when_cost_within_money(self):
        record = shop_envelope(
            money=10,
            kind="purchase",
            item=offer("joker", "j", 5),
            offers=[offer("joker", "j", 5)],
        )
        candidates, _ = encode_shop_decision(record)
        can_afford_idx = SHOP_CONTEXT_FEATURES + len(SHOP_ITEM_TYPES) + 1
        self.assertEqual(candidates[0][can_afford_idx], 1.0)

    def test_can_afford_clear_when_cost_exceeds_money(self):
        record = shop_envelope(
            money=3,
            kind="purchase",
            item=offer("joker", "j", 5),
            offers=[offer("joker", "j", 5)],
        )
        candidates, _ = encode_shop_decision(record)
        can_afford_idx = SHOP_CONTEXT_FEATURES + len(SHOP_ITEM_TYPES) + 1
        self.assertEqual(candidates[0][can_afford_idx], 0.0)


SHOP_GOLDEN = os.path.join(os.path.dirname(__file__), "fixtures", "shop-golden.json")


class ShopGoldenCrossLanguageTests(unittest.TestCase):
    def test_python_encoder_matches_typescript_golden_vectors(self):
        with open(SHOP_GOLDEN) as handle:
            cases = json.load(handle)
        for case in cases:
            candidates, _ = encode_shop_decision(case["record"])
            expected = case["candidates"]
            self.assertEqual(len(candidates), len(expected))
            for got_row, want_row in zip(candidates, expected):
                self.assertEqual(len(got_row), len(want_row))
                for got, want in zip(got_row, want_row):
                    self.assertAlmostEqual(got, want, places=5)


if __name__ == "__main__":
    unittest.main()
