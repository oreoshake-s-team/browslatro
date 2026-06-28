"""Observation/candidate encoding for the advisor policy network.

Mirrors the TypeScript `ModelState` / `HandOption` JSON shapes produced by
`src/ai/dataset.ts` (DATASET_SCHEMA_VERSION 1). The in-browser encoder
(issue #1055) must reproduce these vectors exactly; bump ENCODING_VERSION
on any change.
"""

ENCODING_VERSION = 4

HAND_SLOTS = 16
JOKER_SLOTS = 5
RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"]
SUITS = ["spades", "hearts", "diamonds", "clubs"]
ENHANCEMENTS = ["bonus", "mult", "wild", "glass", "steel", "stone", "gold", "lucky"]
SEALS = ["gold", "red", "blue", "purple"]
EDITIONS = ["foil", "holographic", "polychrome"]
DECKS = [
    "red-deck", "blue-deck", "yellow-deck", "green-deck", "black-deck",
    "magic-deck", "nebula-deck", "ghost-deck", "abandoned-deck", "checkered-deck",
    "zodiac-deck", "painted-deck", "anaglyph-deck", "plasma-deck", "erratic-deck",
]
STAKES = ["white", "red", "green", "black", "blue", "purple", "orange", "gold"]
_DECK_STARTING_HANDS_DELTA = {"blue-deck": 1, "black-deck": -1}
_DECK_STARTING_DISCARDS_DELTA = {"red-deck": 1}
_DECK_JOKER_SLOTS_DELTA = {"black-deck": 1}
_DECK_END_OF_ROUND_BONUS = {"green-deck": 2}
_DECK_NO_INTEREST = {"green-deck"}
BLIND_KINDS = ["small", "big", "boss"]
HAND_LABELS = [
    "High Card", "Pair", "Two Pair", "Three of a Kind", "Straight", "Flush",
    "Full House", "Four of a Kind", "Straight Flush", "Royal Flush",
    "Five of a Kind", "Flush House", "Flush Five",
]
NOTE_KINDS = [
    "best-immediate-score", "best-of-hand-type",
    "commits-to-flush-build", "keeps-paired-ranks",
]
JOKER_EFFECT_CATEGORIES = ["mult", "x-mult", "retrigger", "money", "passive"]
JOKER_RARITIES = ["common", "uncommon", "rare", "legendary"]
JOKER_EDITIONS = ["foil", "holographic", "polychrome", "negative"]

CARD_FEATURES = 2 + len(RANKS) + len(SUITS) + len(ENHANCEMENTS) + len(SEALS) + len(EDITIONS) + 1
CONTEXT_FEATURES = (
    6 + len(BLIND_KINDS) + 1 + len(SUITS) + len(RANKS)
    + len(DECKS) + len(STAKES) + 5 + 1
)
JOKER_SLOT_FEATURES = 1 + len(JOKER_EFFECT_CATEGORIES) + len(JOKER_RARITIES) + len(JOKER_EDITIONS) + 1
JOKER_FEATURES = JOKER_SLOTS * JOKER_SLOT_FEATURES
STATE_FEATURES = HAND_SLOTS * CARD_FEATURES + CONTEXT_FEATURES + JOKER_FEATURES
CANDIDATE_FEATURES = 2 + HAND_SLOTS + len(HAND_LABELS) + 3 + len(NOTE_KINDS)
INPUT_FEATURES = STATE_FEATURES + CANDIDATE_FEATURES


def _joker_effect_category(effect_kind):
    if "x-mult" in effect_kind or "xmult" in effect_kind or effect_kind == "stencil":
        return "x-mult"
    if "retrigger" in effect_kind:
        return "retrigger"
    if "money" in effect_kind or effect_kind in ("business-card", "extra-interest-per-five"):
        return "money"
    if effect_kind == "passive-run-stats":
        return "passive"
    return "mult"


def _one_hot(value, vocabulary):
    vector = [0.0] * len(vocabulary)
    if value is not None:
        vector[vocabulary.index(value)] = 1.0
    return vector


def _stake_starting_discards_delta(stake):
    return -1 if STAKES.index(stake) >= STAKES.index("blue") else 0


def _encode_joker_slot(joker):
    if joker is None:
        return [0.0] * JOKER_SLOT_FEATURES
    return (
        [1.0]
        + _one_hot(_joker_effect_category(joker["effectKind"]), JOKER_EFFECT_CATEGORIES)
        + _one_hot(joker["rarity"], JOKER_RARITIES)
        + _one_hot(joker.get("edition"), JOKER_EDITIONS)
        + [min((joker.get("counter") or 0) / 50.0, 1.0)]
    )


def _encode_card_slot(card):
    if card is None:
        return [0.0] * CARD_FEATURES
    if card["faceDown"]:
        return [1.0, 1.0] + [0.0] * (CARD_FEATURES - 2)
    return (
        [1.0, 0.0]
        + _one_hot(card["rank"], RANKS)
        + _one_hot(card["suit"], SUITS)
        + _one_hot(card["enhancement"], ENHANCEMENTS)
        + _one_hot(card["seal"], SEALS)
        + _one_hot(card["edition"], EDITIONS)
        + [card["bonusChips"] / 100.0]
    )


def encode_state(state):
    hand = state["hand"]
    if len(hand) > HAND_SLOTS:
        raise ValueError(f"hand has {len(hand)} cards, max {HAND_SLOTS}")
    slots = []
    for i in range(HAND_SLOTS):
        slots.extend(_encode_card_slot(hand[i] if i < len(hand) else None))
    target = max(1, state["blind"]["scoreTarget"])
    deck = state["deck"]
    deck_total = max(1, deck["total"])
    deck_id = state.get("deckId", "red-deck")
    stake = state.get("stake", "white")
    context = (
        [
            state["money"] / 20.0,
            state["remainingHands"] / 4.0,
            state["remainingDiscards"] / 4.0,
            min(state["roundScore"] / target, 2.0) / 2.0,
            state["ante"] / 8.0,
            state["round"] / 24.0,
        ]
        + _one_hot(state["blind"]["kind"], BLIND_KINDS)
        + [deck["total"] / 52.0]
        + [deck["bySuit"][suit] / deck_total for suit in SUITS]
        + [deck["byRank"][rank] / deck_total for rank in RANKS]
        + _one_hot(deck_id, DECKS)
        + _one_hot(stake, STAKES)
        + [
            _DECK_STARTING_HANDS_DELTA.get(deck_id, 0) / 2.0,
            _DECK_STARTING_DISCARDS_DELTA.get(deck_id, 0) / 2.0,
            _DECK_JOKER_SLOTS_DELTA.get(deck_id, 0) / 2.0,
            _DECK_END_OF_ROUND_BONUS.get(deck_id, 0) / 5.0,
            1.0 if deck_id in _DECK_NO_INTEREST else 0.0,
            _stake_starting_discards_delta(stake) / 2.0,
        ]
    )
    jokers = state.get("jokers", [])
    joker_slots = []
    for i in range(JOKER_SLOTS):
        joker_slots.extend(_encode_joker_slot(jokers[i] if i < len(jokers) else None))
    return slots + context + joker_slots


def encode_candidate(candidate, state):
    import math

    hand_ids = [card["id"] for card in state["hand"]]
    mask = [0.0] * HAND_SLOTS
    for card_id in candidate["cardIds"]:
        index = hand_ids.index(card_id)
        if state["hand"][index].get("faceDown"):
            continue
        mask[index] = 1.0
    is_play = candidate["action"] == "play"
    target = max(1, state["blind"]["scoreTarget"])
    if is_play:
        score_features = [
            min(math.log1p(candidate["score"]) / math.log1p(target), 2.0) / 2.0,
            math.log1p(candidate["chips"]) / 10.0,
            math.log1p(candidate["mult"]) / 10.0,
        ]
        label = _one_hot(candidate["handLabel"], HAND_LABELS)
    else:
        score_features = [0.0, 0.0, 0.0]
        label = [0.0] * len(HAND_LABELS)
    notes = [0.0] * len(NOTE_KINDS)
    for note in candidate["notes"]:
        notes[NOTE_KINDS.index(note["kind"])] = 1.0
    return (
        [1.0 if is_play else 0.0, 0.0 if is_play else 1.0]
        + mask
        + label
        + score_features
        + notes
    )


def encode_decision(record):
    """Returns (per-candidate input vectors, chosen index) for one record."""
    state_vector = encode_state(record["state"])
    inputs = [
        state_vector + encode_candidate(candidate, record["state"])
        for candidate in record["candidates"]
    ]
    return inputs, record["chosenIndex"]


SHOP_ENCODING_VERSION = 4
SHOP_ITEM_TYPES = ["joker", "planet", "tarot", "spectral", "playing-card", "pack", "voucher"]
SHOP_CANDIDATE_CATEGORIES = [
    "joker-mult",
    "joker-x-mult",
    "joker-retrigger",
    "joker-money",
    "joker-passive",
    "planet",
    "tarot-enhance",
    "tarot-economy",
    "tarot-create",
    "tarot-deck",
    "spectral",
    "other",
]
SHOP_ATTRIBUTE_FEATURES = 18
SHOP_BUILD_FEATURES = (
    len(HAND_LABELS)
    + 1
    + len(JOKER_RARITIES)
    + len(JOKER_EFFECT_CATEGORIES)
    + 1
    + len(ENHANCEMENTS)
)
SHOP_CONTEXT_FEATURES = 4 + SHOP_BUILD_FEATURES
SHOP_CANDIDATE_FEATURES = (
    len(SHOP_ITEM_TYPES) + 5 + len(SHOP_CANDIDATE_CATEGORIES) + SHOP_ATTRIBUTE_FEATURES
)
SHOP_INPUT_FEATURES = SHOP_CONTEXT_FEATURES + SHOP_CANDIDATE_FEATURES
SHOP_INPUT_FEATURES_V2 = SHOP_INPUT_FEATURES + 1


def _shop_attributes(attrs):
    if not attrs:
        return [0.0] * SHOP_ATTRIBUTE_FEATURES
    vals = [float(x) for x in attrs[:SHOP_ATTRIBUTE_FEATURES]]
    if len(vals) < SHOP_ATTRIBUTE_FEATURES:
        vals += [0.0] * (SHOP_ATTRIBUTE_FEATURES - len(vals))
    return vals


def _encode_shop_build(record):
    levels = record.get("handLevels") or {}
    jokers = record.get("jokers") or []
    rarity_counts = {r: 0 for r in JOKER_RARITIES}
    category_counts = {c: 0 for c in JOKER_EFFECT_CATEGORIES}
    for joker in jokers:
        rarity = joker.get("rarity")
        if rarity in rarity_counts:
            rarity_counts[rarity] += 1
        category_counts[_joker_effect_category(joker.get("effectKind", ""))] += 1
    enhancements = record.get("deckEnhancements") or {}
    return (
        [levels.get(label, 1) / 20.0 for label in HAND_LABELS]
        + [len(jokers) / 5.0]
        + [rarity_counts[r] / 5.0 for r in JOKER_RARITIES]
        + [category_counts[c] / 5.0 for c in JOKER_EFFECT_CATEGORIES]
        + [record.get("consumablesHeld", 0) / 2.0]
        + [enhancements.get(e, 0) / 52.0 for e in ENHANCEMENTS]
    )


def _encode_shop_context(record):
    return [
        record["money"] / 20.0,
        record["ante"] / 8.0,
        record["round"] / 24.0,
        record.get("picksRemaining", 0) / 5.0,
    ] + _encode_shop_build(record)


def _encode_shop_candidate(
    item_type,
    cost,
    money,
    *,
    category="other",
    attributes=None,
    is_reroll=False,
    is_leave=False,
    is_skip=False,
):
    return (
        _one_hot(item_type, SHOP_ITEM_TYPES)
        + [cost / 20.0, 1.0 if cost <= money else 0.0]
        + [1.0 if is_reroll else 0.0, 1.0 if is_leave else 0.0, 1.0 if is_skip else 0.0]
        + _one_hot(category, SHOP_CANDIDATE_CATEGORIES)
        + _shop_attributes(attributes)
    )


def encode_shop_decision(record):
    """Returns (per-candidate input vectors, chosen_index) for a shop/pack RunEventRecord.

    purchase  → buy-candidates for each offer + leave; chosen = index of bought offer
    reroll    → buy-candidates for each rejected offer + reroll + leave; chosen = reroll index
    pack-pick → pick-candidates for each option + skip; chosen = pickedIndex or skip
    """
    ctx = _encode_shop_context(record)
    kind = record["kind"]
    money = record["money"]

    if kind == "purchase":
        offers = record["offers"]
        candidates = [
            ctx + _encode_shop_candidate(o["itemType"], o["cost"], money, category=o.get("category", "other"), attributes=o.get("attributes"))
            for o in offers
        ]
        candidates.append(ctx + _encode_shop_candidate(None, 0, money, is_leave=True))
        item = record.get("item")
        if item is None:
            chosen = len(offers)
        else:
            chosen = next((i for i, o in enumerate(offers) if o["id"] == item["id"]), -1)
        return candidates, chosen

    if kind == "reroll":
        offers = record["offers"]
        candidates = [
            ctx + _encode_shop_candidate(o["itemType"], o["cost"], money, category=o.get("category", "other"), attributes=o.get("attributes"))
            for o in offers
        ]
        candidates.append(ctx + _encode_shop_candidate(None, record["cost"], money, is_reroll=True))
        candidates.append(ctx + _encode_shop_candidate(None, 0, money, is_leave=True))
        return candidates, len(offers)

    if kind == "pack-pick":
        options = record["options"]
        candidates = [
            ctx + _encode_shop_candidate(o["optionType"], 0, money, category=o.get("category", "other"), attributes=o.get("attributes"))
            for o in options
        ]
        candidates.append(ctx + _encode_shop_candidate(None, 0, money, is_skip=True))
        picked = record["pickedIndex"]
        chosen = picked if picked is not None else len(options)
        return candidates, chosen

    return [], -1


def encode_shop_decision_v2(record):
    """V2 (use-aware) shop encoding: appends a trailing isUse flag per candidate.

    Existing decision kinds carry isUse=0 on every candidate. The use-action
    decision kind (logged once the headless sim's hold-consumables path feeds
    training) sets the flag on its held-consumable candidates.
    """
    candidates, chosen = encode_shop_decision(record)
    use_flags = record.get("useFlags")
    if use_flags is None:
        return [row + [0.0] for row in candidates], chosen
    return [
        row + [1.0 if i < len(use_flags) and use_flags[i] else 0.0]
        for i, row in enumerate(candidates)
    ], chosen
