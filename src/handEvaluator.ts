import type { Card, Hand, Rank } from "./types";
import { HANDS } from "./constants";

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
  HANDS.map((h) => [h.label, h])
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
  return [...counts.values()].sort((a, b) => b - a);
}

function isFlush(cards: ReadonlyArray<Card>): boolean {
  if (cards.length !== 5) return false;
  const suit = cards[0].suit;
  return cards.every((c) => c.suit === suit);
}

function isStraight(cards: ReadonlyArray<Card>): boolean {
  if (cards.length !== 5) return false;
  const values = cards.map((c) => RANK_VALUES[c.rank]).sort((a, b) => a - b);
  if (new Set(values).size !== 5) return false;
  if (values[4] - values[0] === 4) return true;
  // Ace-low straight: A-2-3-4-5 → [2, 3, 4, 5, 14]
  return (
    values[0] === 2 &&
    values[1] === 3 &&
    values[2] === 4 &&
    values[3] === 5 &&
    values[4] === 14
  );
}

function isRoyal(cards: ReadonlyArray<Card>): boolean {
  if (cards.length !== 5) return false;
  const values = cards.map((c) => RANK_VALUES[c.rank]).sort((a, b) => a - b);
  return values[0] === 10 && values[4] === 14;
}

export function detectHandLabel(cards: ReadonlyArray<Card>): HandLabel {
  if (cards.length === 0) return "High Card";

  const counts = countByRank(cards);
  const flush = isFlush(cards);
  const straight = isStraight(cards);
  const fiveOfKind = counts[0] === 5;
  const fullHouse = counts[0] === 3 && counts[1] === 2;

  if (flush && fiveOfKind) return "Flush Five";
  if (flush && fullHouse) return "Flush House";
  if (fiveOfKind) return "Five of a Kind";
  if (flush && straight && isRoyal(cards)) return "Royal Flush";
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

export function evaluateHand(cards: ReadonlyArray<Card>): Hand {
  return getHand(detectHandLabel(cards));
}
