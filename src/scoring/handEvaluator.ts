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
  ["Full House", ["High Card", "Pair", "Two Pair", "Three of a Kind", "Full House"]],
  ["Four of a Kind", ["High Card", "Pair", "Three of a Kind", "Four of a Kind"]],
  ["Straight Flush", ["High Card", "Straight", "Flush", "Straight Flush"]],
  ["Royal Flush", ["High Card", "Straight", "Flush", "Straight Flush", "Royal Flush"]],
  ["Five of a Kind", ["High Card", "Pair", "Three of a Kind", "Four of a Kind", "Five of a Kind"]],
  ["Flush House", ["High Card", "Pair", "Two Pair", "Three of a Kind", "Full House", "Flush", "Flush House"]],
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

function evalSuit(card: Card, smearedSuits: boolean): Suit | null {
  const raw = cardSuitForEvaluation(card);
  return raw === null ? null : mergedSuit(raw, smearedSuits);
}

function suitTally(
  cards: ReadonlyArray<Card>,
  smearedSuits: boolean,
): { readonly wild: number; readonly counts: ReadonlyMap<Suit, number> } {
  let wild = 0;
  const counts = new Map<Suit, number>();
  for (const c of cards) {
    const s = evalSuit(c, smearedSuits);
    if (s === null) wild += 1;
    else counts.set(s, (counts.get(s) ?? 0) + 1);
  }
  return { wild, counts };
}

function isFlush(cards: ReadonlyArray<Card>, options: HandEvalOptions = {}): boolean {
  const minLen = options.fourFingers ? 4 : 5;
  if (cards.length < minLen || cards.length > 5) return false;
  const { wild, counts } = suitTally(cards, options.smearedSuits === true);
  if (counts.size === 0) return wild >= minLen;
  for (const c of counts.values()) {
    if (c + wild >= minLen) return true;
  }
  return false;
}

function isStrictFlush(
  cards: ReadonlyArray<Card>,
  options: HandEvalOptions = {},
): boolean {
  if (cards.length < 5 || cards.length > 5) return false;
  const { wild, counts } = suitTally(cards, options.smearedSuits === true);
  if (counts.size === 0) return wild === cards.length;
  for (const c of counts.values()) {
    if (c + wild === cards.length) return true;
  }
  return false;
}

export function flushAnchorSuit(
  cards: ReadonlyArray<Card>,
  options: HandEvalOptions = {},
): Suit | null {
  const minLen = options.fourFingers ? 4 : 5;
  if (cards.length < minLen || cards.length > 5) return null;
  const { wild, counts } = suitTally(cards, options.smearedSuits === true);
  let best: Suit | null = null;
  let bestCount = 0;
  for (const [suit, c] of counts.entries()) {
    if (c + wild >= minLen && c > bestCount) {
      best = suit;
      bestCount = c;
    }
  }
  return best;
}

function longestRun(
  sortedUnique: ReadonlyArray<number>,
  maxGap: number,
): ReadonlyArray<number> {
  if (sortedUnique.length === 0) return [];
  let best: number[] = [sortedUnique[0]];
  let current: number[] = [sortedUnique[0]];
  for (let i = 1; i < sortedUnique.length; i += 1) {
    const gap = sortedUnique[i] - sortedUnique[i - 1];
    if (gap >= 1 && gap <= maxGap) {
      current.push(sortedUnique[i]);
    } else {
      current = [sortedUnique[i]];
    }
    if (current.length > best.length) best = current.slice();
  }
  return best;
}

export function straightRunValues(
  cards: ReadonlyArray<Card>,
  options: HandEvalOptions = {},
): ReadonlyArray<number> | null {
  const minLen = options.fourFingers ? 4 : 5;
  if (cards.length < minLen || cards.length > 5) return null;
  const unique = Array.from(
    new Set(cards.map((c) => RANK_VALUES[c.rank])),
  ).sort((a, b) => a - b);
  if (unique.length < minLen) return null;
  const maxGap = options.shortcut ? 2 : 1;
  const high = longestRun(unique, maxGap);
  if (high.length >= minLen) return high;
  if (unique[unique.length - 1] === 14) {
    const aceLow = [1, ...unique.slice(0, -1)];
    const aceLowRun = longestRun(aceLow, maxGap);
    if (aceLowRun.length >= minLen) return aceLowRun;
  }
  return null;
}

function isStraight(cards: ReadonlyArray<Card>, options: HandEvalOptions = {}): boolean {
  return straightRunValues(cards, options) !== null;
}

function isRoyal(cards: ReadonlyArray<Card>, options: HandEvalOptions = {}): boolean {
  const run = straightRunValues(cards, options);
  if (run === null) return false;
  return run[run.length - 1] === 14 && run[0] === 14 - run.length + 1;
}

export function detectHandLabel(
  cards: ReadonlyArray<Card>,
  options: HandEvalOptions = {},
): HandLabel {
  if (cards.length === 0) return "High Card";

  const meaningful = cards.filter((c) => !isStoneCard(c));

  const counts = countByRank(meaningful);
  const flush = isFlush(meaningful, options);
  const strictFlush = isStrictFlush(meaningful, options);
  const straight = isStraight(meaningful, options);
  const fiveOfKind = counts[0] === 5;
  const fullHouse = counts[0] === 3 && counts[1] === 2;

  if (strictFlush && fiveOfKind) return "Flush Five";
  if (strictFlush && fullHouse) return "Flush House";
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
