import type { Card, Hand, Rank, Suit } from "../cards/types";
import { HANDS } from "../constants";
import { cardSuitForEvaluation, isStoneCard } from "../cards/enhancements";

export type HandLabel =
  | "High Card"
  | "Pair"
  | "Two Pair"
  | "Three of a Kind"
  | "Straight"
  | "Flush"
  | "Full House"
  | "Four of a Kind"
  | "Straight Flush"
  | "Royal Flush"
  | "Five of a Kind"
  | "Flush House"
  | "Flush Five";

const CONTAINMENT_ROWS: ReadonlyArray<readonly [HandLabel, ReadonlyArray<HandLabel>]> = [
  ["High Card", ["High Card"]],
  ["Pair", ["High Card", "Pair"]],
  ["Two Pair", ["High Card", "Pair", "Two Pair"]],
  ["Three of a Kind", ["High Card", "Pair", "Three of a Kind"]],
  ["Straight", ["High Card", "Straight"]],
  ["Flush", ["High Card", "Flush"]],
  ["Full House", ["High Card", "Pair", "Three of a Kind", "Full House"]],
  ["Four of a Kind", ["High Card", "Pair", "Three of a Kind", "Four of a Kind"]],
  ["Straight Flush", ["High Card", "Straight", "Flush", "Straight Flush"]],
  ["Royal Flush", ["High Card", "Straight", "Flush", "Straight Flush", "Royal Flush"]],
  ["Five of a Kind", ["High Card", "Pair", "Three of a Kind", "Four of a Kind", "Five of a Kind"]],
  ["Flush House", ["High Card", "Pair", "Three of a Kind", "Full House", "Flush", "Flush House"]],
  ["Flush Five", ["High Card", "Pair", "Three of a Kind", "Four of a Kind", "Five of a Kind", "Flush", "Flush Five"]],
];

export const HAND_TYPE_CONTAINS: ReadonlyMap<HandLabel, ReadonlySet<HandLabel>> = new Map(
  CONTAINMENT_ROWS.map(([label, contained]) => [label, new Set<HandLabel>(contained)]),
);

export function handContains(played: HandLabel, requires: HandLabel): boolean {
  const set = HAND_TYPE_CONTAINS.get(played);
  return set !== undefined && set.has(requires);
}

const RANK_VALUES: Record<Rank, number> = {
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  "10": 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
};

const HANDS_BY_LABEL: ReadonlyMap<HandLabel, Hand> = new Map(
  HANDS.map((h) => [h.label as HandLabel, h])
);

function getHand(label: HandLabel): Hand {
  const hand = HANDS_BY_LABEL.get(label);
  if (!hand) {
    throw new Error(`Unknown hand label: ${label}`);
  }
  return hand;
}

function countByRank(cards: ReadonlyArray<Card>): number[] {
  const counts = new Map<Rank, number>();
  for (const card of cards) {
    counts.set(card.rank, (counts.get(card.rank) ?? 0) + 1);
  }
  return Array.from(counts.values()).sort((a, b) => b - a);
}

export interface HandEvalOptions {
  readonly fourFingers?: boolean;
  readonly shortcut?: boolean;
  readonly smearedSuits?: boolean;
}

export function mergedSuit(suit: Suit, smearedSuits = false): Suit {
  if (!smearedSuits) return suit;
  if (suit === "hearts") return "diamonds";
  if (suit === "spades") return "clubs";
  return suit;
}

function isFlush(cards: ReadonlyArray<Card>, options: HandEvalOptions = {}): boolean {
  const minLen = options.fourFingers ? 4 : 5;
  if (cards.length < minLen || cards.length > 5) return false;
  const rawSuits = cards.map(cardSuitForEvaluation);
  const suits = rawSuits.map((s) =>
    s === null ? null : mergedSuit(s, options.smearedSuits === true),
  );
  const anchor = suits.find((s) => s !== null);
  if (anchor === undefined) return true;
  return suits.every((s) => s === null || s === anchor);
}

function isStraight(cards: ReadonlyArray<Card>, options: HandEvalOptions = {}): boolean {
  const minLen = options.fourFingers ? 4 : 5;
  if (cards.length < minLen || cards.length > 5) return false;
  const values = cards.map((c) => RANK_VALUES[c.rank]).sort((a, b) => a - b);
  if (new Set(values).size !== values.length) return false;
  if (isConsecutiveRun(values, options)) return true;
  return isAceLowStraight(values, options);
}

function isConsecutiveRun(
  values: ReadonlyArray<number>,
  options: HandEvalOptions,
): boolean {
  const maxGap = options.shortcut ? 2 : 1;
  for (let i = 1; i < values.length; i += 1) {
    const gap = values[i] - values[i - 1];
    if (gap < 1 || gap > maxGap) return false;
  }
  return true;
}

function isAceLowStraight(
  values: ReadonlyArray<number>,
  options: HandEvalOptions,
): boolean {
  if (values[values.length - 1] !== 14) return false;
  const lowEnd = values.slice(0, values.length - 1);
  if (options.fourFingers && lowEnd.length === 3) {
    return lowEnd[0] === 2 && lowEnd[1] === 3 && lowEnd[2] === 4;
  }
  if (lowEnd.length !== 4) return false;
  return lowEnd[0] === 2 && lowEnd[1] === 3 && lowEnd[2] === 4 && lowEnd[3] === 5;
}

function isRoyal(cards: ReadonlyArray<Card>, options: HandEvalOptions = {}): boolean {
  const minLen = options.fourFingers ? 4 : 5;
  if (cards.length < minLen || cards.length > 5) return false;
  const values = cards.map((c) => RANK_VALUES[c.rank]).sort((a, b) => a - b);
  if (values[values.length - 1] !== 14) return false;
  const expectedLow = 14 - values.length + 1;
  return values[0] === expectedLow;
}

export function detectHandLabel(
  cards: ReadonlyArray<Card>,
  options: HandEvalOptions = {},
): HandLabel {
  if (cards.length === 0) return "High Card";

  // Stone cards have no rank or suit for the purposes of hand detection.
  // They still always score (handled in getScoringCards) but are invisible
  // to flush/straight/grouping checks.
  const meaningful = cards.filter((c) => !isStoneCard(c));

  const counts = countByRank(meaningful);
  const flush = isFlush(meaningful, options);
  const straight = isStraight(meaningful, options);
  const fiveOfKind = counts[0] === 5;
  const fullHouse = counts[0] === 3 && counts[1] === 2;

  if (flush && fiveOfKind) return "Flush Five";
  if (flush && fullHouse) return "Flush House";
  if (fiveOfKind) return "Five of a Kind";
  if (flush && straight && isRoyal(meaningful, options)) return "Royal Flush";
  if (flush && straight) return "Straight Flush";
  if (counts[0] === 4) return "Four of a Kind";
  if (fullHouse) return "Full House";
  if (flush) return "Flush";
  if (straight) return "Straight";
  if (counts[0] === 3) return "Three of a Kind";
  if (counts[0] === 2 && counts[1] === 2) return "Two Pair";
  if (counts[0] === 2) return "Pair";
  return "High Card";
}

export function evaluateHand(
  cards: ReadonlyArray<Card>,
  options: HandEvalOptions = {},
): Hand {
  return getHand(detectHandLabel(cards, options));
}
