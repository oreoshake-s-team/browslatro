import type { Card, Rank } from "./types";
import { detectHandLabel, evaluateHand, type HandLabel } from "./handEvaluator";

/**
 * Per-rank chip contribution for "scoring" cards. Face cards (J, Q, K) are
 * worth 10 chips, aces are worth 11, and number cards are worth their face value.
 */
const RANK_CHIPS: Record<Rank, number> = {
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  "10": 10,
  J: 10,
  Q: 10,
  K: 10,
  A: 11,
};

/**
 * Returns the chip value contributed by a single card based on its rank.
 */
export function getRankChips(rank: Rank): number {
  return RANK_CHIPS[rank];
}

/**
 * Groups cards by rank, preserving each card's original identity.
 */
function groupByRank(cards: ReadonlyArray<Card>): Map<Rank, Card[]> {
  const grouped = new Map<Rank, Card[]>();
  for (const card of cards) {
    const bucket = grouped.get(card.rank);
    if (bucket) {
      bucket.push(card);
    } else {
      grouped.set(card.rank, [card]);
    }
  }
  return grouped;
}

const RANK_ORDER: Record<Rank, number> = {
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

/**
 * Returns the cards that contribute chips for the given hand label, preserving
 * original card identity. Cards not part of the scoring combination (e.g.
 * kickers in a Pair) are excluded.
 *
 * For "made" hands that use all five cards (Straight, Flush, Full House,
 * Straight Flush, Royal Flush, Flush House, Flush Five, Five of a Kind), every
 * card scores. For grouping hands (Pair, Two Pair, Three/Four of a Kind), only
 * the cards forming the group score. For High Card, only the single highest
 * card scores.
 */
export function getScoringCards(
  cards: ReadonlyArray<Card>,
  label: HandLabel,
): Card[] {
  if (cards.length === 0) return [];

  switch (label) {
    case "Straight":
    case "Flush":
    case "Full House":
    case "Straight Flush":
    case "Royal Flush":
    case "Five of a Kind":
    case "Flush House":
    case "Flush Five":
      return cards.slice();
    case "Four of a Kind":
      return pickByGroupSize(cards, 4);
    case "Three of a Kind":
      return pickByGroupSize(cards, 3);
    case "Two Pair":
      return pickAllGroupsOfSize(cards, 2);
    case "Pair":
      return pickByGroupSize(cards, 2);
    case "High Card":
      return [pickHighestCard(cards)];
  }
}

function pickByGroupSize(cards: ReadonlyArray<Card>, size: number): Card[] {
  const grouped = groupByRank(cards);
  const buckets = Array.from(grouped.values());
  for (const bucket of buckets) {
    if (bucket.length === size) return bucket.slice();
  }
  // Fallback: if no exact match (shouldn't happen for a correctly-labelled
  // hand), return everything so we don't silently drop chips.
  return cards.slice();
}

function pickAllGroupsOfSize(
  cards: ReadonlyArray<Card>,
  size: number,
): Card[] {
  const grouped = groupByRank(cards);
  const buckets = Array.from(grouped.values());
  const result: Card[] = [];
  for (const bucket of buckets) {
    if (bucket.length === size) result.push(...bucket);
  }
  return result;
}

function pickHighestCard(cards: ReadonlyArray<Card>): Card {
  let best = cards[0];
  for (const card of cards) {
    if (RANK_ORDER[card.rank] > RANK_ORDER[best.rank]) best = card;
  }
  return best;
}

/**
 * Computes the final score for the given played cards by:
 *   (hand chips + sum of scoring-card rank chips) × hand multiplier
 * The result is floored to an integer.
 *
 * Returns 0 when no cards are played.
 */
export function scoreHand(cards: ReadonlyArray<Card>): number {
  if (cards.length === 0) return 0;
  const label = detectHandLabel(cards);
  const hand = evaluateHand(cards);
  const scoringCards = getScoringCards(cards, label);
  const cardChips = scoringCards.reduce(
    (sum, card) => sum + getRankChips(card.rank),
    0,
  );
  return Math.floor((hand.chips + cardChips) * hand.multiplier);
}
