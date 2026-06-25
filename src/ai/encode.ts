import type {
  CardEdition,
  Enhancement,
  Rank,
  Seal,
  Suit,
} from "../cards/types";
import type { JokerEdition, JokerRarity } from "../items/jokers/types";
import type { Deck } from "../items/decks";
import {
  deckEndOfRoundBonusPerRemainingHandAndDiscard,
  deckJokerSlotsDelta,
  deckStartingDiscardsDelta,
  deckStartingHandsDelta,
  deckSuppressesInterest,
} from "../items/decks";
import type { Stake } from "../items/stakes";
import { stakeStartingDiscardsDelta } from "../items/stakes";
import type { HandLabel } from "../scoring/handEvaluator";
import type { HandOption, HandOptionNote } from "./getHandOptions";
import type { ModelHandCard, ModelJoker, ModelState } from "./modelState";

export const ENCODING_VERSION = 4;

export const HAND_SLOTS = 16;
export const JOKER_SLOTS = 5;

const RANKS: ReadonlyArray<Rank> = [
  "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A",
];
const SUITS: ReadonlyArray<Suit> = ["spades", "hearts", "diamonds", "clubs"];
export const ENHANCEMENTS: ReadonlyArray<Enhancement> = [
  "bonus", "mult", "wild", "glass", "steel", "stone", "gold", "lucky",
];
const SEALS: ReadonlyArray<Seal> = ["gold", "red", "blue", "purple"];
const EDITIONS: ReadonlyArray<CardEdition> = [
  "foil", "holographic", "polychrome",
];
export const JOKER_EFFECT_CATEGORIES = ["mult", "x-mult", "retrigger", "money", "passive"] as const;
export const JOKER_RARITIES: ReadonlyArray<JokerRarity> = [
  "common", "uncommon", "rare", "legendary",
];
const JOKER_EDITIONS: ReadonlyArray<JokerEdition> = [
  "foil", "holographic", "polychrome", "negative",
];

const DECKS: ReadonlyArray<Deck> = [
  "red-deck", "blue-deck", "yellow-deck", "green-deck", "black-deck",
  "magic-deck", "nebula-deck", "ghost-deck", "abandoned-deck", "checkered-deck",
  "zodiac-deck", "painted-deck", "anaglyph-deck", "plasma-deck", "erratic-deck",
];
const STAKES: ReadonlyArray<Stake> = [
  "white", "red", "green", "black", "blue", "purple", "orange", "gold",
];
const DECK_DERIVED_FEATURES = 5;
const STAKE_DERIVED_FEATURES = 1;

const BLIND_KINDS = ["small", "big", "boss"] as const;
export const HAND_LABELS: ReadonlyArray<HandLabel> = [
  "High Card", "Pair", "Two Pair", "Three of a Kind", "Straight", "Flush",
  "Full House", "Four of a Kind", "Straight Flush", "Royal Flush",
  "Five of a Kind", "Flush House", "Flush Five",
];
const NOTE_KINDS: ReadonlyArray<HandOptionNote["kind"]> = [
  "best-immediate-score", "best-of-hand-type",
  "commits-to-flush-build", "keeps-paired-ranks",
];

export const CARD_FEATURES =
  2 + RANKS.length + SUITS.length + ENHANCEMENTS.length + SEALS.length + EDITIONS.length + 1;
export const CONTEXT_FEATURES =
  6 + BLIND_KINDS.length + 1 + SUITS.length + RANKS.length +
  DECKS.length + STAKES.length + DECK_DERIVED_FEATURES + STAKE_DERIVED_FEATURES;
export const JOKER_SLOT_FEATURES =
  1 + JOKER_EFFECT_CATEGORIES.length + JOKER_RARITIES.length + JOKER_EDITIONS.length + 1;
export const JOKER_FEATURES = JOKER_SLOTS * JOKER_SLOT_FEATURES;
export const STATE_FEATURES = HAND_SLOTS * CARD_FEATURES + CONTEXT_FEATURES + JOKER_FEATURES;
export const CANDIDATE_FEATURES =
  2 + HAND_SLOTS + HAND_LABELS.length + 3 + NOTE_KINDS.length;
export const INPUT_FEATURES = STATE_FEATURES + CANDIDATE_FEATURES;

type JokerEffectCategory = (typeof JOKER_EFFECT_CATEGORIES)[number];

export function jokerEffectCategory(effectKind: string): JokerEffectCategory {
  if (effectKind.includes("x-mult") || effectKind.includes("xmult") || effectKind === "stencil") {
    return "x-mult";
  }
  if (effectKind.includes("retrigger")) return "retrigger";
  if (
    effectKind.includes("money") ||
    effectKind === "business-card" ||
    effectKind === "extra-interest-per-five"
  ) {
    return "money";
  }
  if (effectKind === "passive-run-stats") return "passive";
  return "mult";
}

function oneHot<T>(value: T | null, vocabulary: ReadonlyArray<T>): number[] {
  const vector = new Array<number>(vocabulary.length).fill(0);
  if (value !== null) {
    const index = vocabulary.indexOf(value);
    if (index === -1) throw new Error(`unknown vocabulary value: ${String(value)}`);
    vector[index] = 1;
  }
  return vector;
}

function encodeCardSlot(card: ModelHandCard | null): number[] {
  if (card === null) return new Array<number>(CARD_FEATURES).fill(0);
  if (card.faceDown) {
    return [1, 1, ...new Array<number>(CARD_FEATURES - 2).fill(0)];
  }
  return [
    1,
    0,
    ...oneHot(card.rank, RANKS),
    ...oneHot(card.suit, SUITS),
    ...oneHot(card.enhancement, ENHANCEMENTS),
    ...oneHot(card.seal, SEALS),
    ...oneHot(card.edition, EDITIONS),
    card.bonusChips / 100,
  ];
}

function encodeJokerSlot(joker: ModelJoker | null): number[] {
  if (joker === null) return new Array<number>(JOKER_SLOT_FEATURES).fill(0);
  return [
    1,
    ...oneHot(jokerEffectCategory(joker.effectKind), JOKER_EFFECT_CATEGORIES),
    ...oneHot(joker.rarity, JOKER_RARITIES),
    ...oneHot(joker.edition, JOKER_EDITIONS),
    Math.min((joker.counter ?? 0) / 50, 1),
  ];
}

export function encodeState(state: ModelState): number[] {
  if (state.hand.length > HAND_SLOTS) {
    throw new Error(`hand has ${state.hand.length} cards, max ${HAND_SLOTS}`);
  }
  const slots: number[] = [];
  for (let i = 0; i < HAND_SLOTS; i += 1) {
    slots.push(...encodeCardSlot(i < state.hand.length ? state.hand[i] : null));
  }
  const target = Math.max(1, state.blind.scoreTarget);
  const deckTotal = Math.max(1, state.deck.total);
  const jokerSlots: number[] = [];
  for (let i = 0; i < JOKER_SLOTS; i += 1) {
    jokerSlots.push(...encodeJokerSlot(i < state.jokers.length ? state.jokers[i] : null));
  }
  return [
    ...slots,
    state.money / 20,
    state.remainingHands / 4,
    state.remainingDiscards / 4,
    Math.min(state.roundScore / target, 2) / 2,
    state.ante / 8,
    state.round / 24,
    ...oneHot(state.blind.kind, BLIND_KINDS),
    state.deck.total / 52,
    ...SUITS.map((suit) => state.deck.bySuit[suit] / deckTotal),
    ...RANKS.map((rank) => state.deck.byRank[rank] / deckTotal),
    ...oneHot(state.deckId, DECKS),
    ...oneHot(state.stake, STAKES),
    deckStartingHandsDelta(state.deckId) / 2,
    deckStartingDiscardsDelta(state.deckId) / 2,
    deckJokerSlotsDelta(state.deckId) / 2,
    deckEndOfRoundBonusPerRemainingHandAndDiscard(state.deckId) / 5,
    deckSuppressesInterest(state.deckId) ? 1 : 0,
    stakeStartingDiscardsDelta(state.stake) / 2,
    ...jokerSlots,
  ];
}

export function encodeCandidate(
  candidate: HandOption,
  state: ModelState,
): number[] {
  const handIds = state.hand.map((card) => card.id);
  const mask = new Array<number>(HAND_SLOTS).fill(0);
  for (const cardId of candidate.cardIds) {
    const index = handIds.indexOf(cardId);
    if (index === -1) throw new Error(`candidate card ${cardId} not in hand`);
    if (state.hand[index].faceDown) continue;
    mask[index] = 1;
  }
  const isPlay = candidate.action === "play";
  const target = Math.max(1, state.blind.scoreTarget);
  const scoreFeatures = isPlay
    ? [
        Math.min(Math.log1p(candidate.score) / Math.log1p(target), 2) / 2,
        Math.log1p(candidate.chips) / 10,
        Math.log1p(candidate.mult) / 10,
      ]
    : [0, 0, 0];
  const label = isPlay
    ? oneHot(candidate.handLabel, HAND_LABELS)
    : new Array<number>(HAND_LABELS.length).fill(0);
  const notes = new Array<number>(NOTE_KINDS.length).fill(0);
  for (const note of candidate.notes) {
    notes[NOTE_KINDS.indexOf(note.kind)] = 1;
  }
  return [isPlay ? 1 : 0, isPlay ? 0 : 1, ...mask, ...label, ...scoreFeatures, ...notes];
}

export function encodeDecision(
  state: ModelState,
  candidates: ReadonlyArray<HandOption>,
): Float32Array {
  const stateVector = encodeState(state);
  const out = new Float32Array(candidates.length * INPUT_FEATURES);
  candidates.forEach((candidate, row) => {
    const vector = [...stateVector, ...encodeCandidate(candidate, state)];
    out.set(vector, row * INPUT_FEATURES);
  });
  return out;
}
