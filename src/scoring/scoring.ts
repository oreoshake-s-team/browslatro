import type { Card, Rank } from "../cards/types";
import {
  detectHandLabel,
  evaluateHand,
  flushAnchorSuit,
  mergedSuit,
  straightRunValues,
  type HandEvalOptions,
  type HandLabel,
} from "./handEvaluator";
import {
  applyCardEnhancement,
  cardRankForEvaluation,
  cardSuitForEvaluation,
  isStoneCard,
} from "../cards/enhancements";

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

export function getCardChips(card: Card): number {
  const evalRank = cardRankForEvaluation(card);
  const rankChips = evalRank === null ? 0 : RANK_CHIPS[evalRank];
  return rankChips + applyCardEnhancement(card).chipsDelta + (card.bonusChips ?? 0);
}

export function getCardMultDelta(card: Card): number {
  return applyCardEnhancement(card).multDelta;
}

export function getCardMultTimes(card: Card): number {
  return applyCardEnhancement(card).multTimes;
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
export interface GetScoringCardsOptions {
  readonly allCardsScore?: boolean;
  readonly evalOptions?: HandEvalOptions;
}

export function getScoringCards(
  cards: ReadonlyArray<Card>,
  label: HandLabel,
  options: GetScoringCardsOptions = {},
): Card[] {
  if (cards.length === 0) return [];

  const stones = cards.filter(isStoneCard);
  const nonStones = cards.filter((c) => !isStoneCard(c));

  if (options.allCardsScore === true) {
    return cards.slice();
  }

  const evalOpts = options.evalOptions ?? {};
  let matched: Card[];
  switch (label) {
    case "Full House":
    case "Five of a Kind":
    case "Flush House":
    case "Flush Five":
      matched = nonStones.slice();
      break;
    case "Flush":
      matched = pickFlushCards(nonStones, evalOpts);
      break;
    case "Straight":
      matched = pickStraightCards(nonStones, evalOpts);
      break;
    case "Straight Flush":
    case "Royal Flush": {
      const flushIds = new Set(pickFlushCards(nonStones, evalOpts).map((c) => c.id));
      matched = pickStraightCards(nonStones, evalOpts).filter((c) =>
        flushIds.has(c.id),
      );
      if (matched.length === 0) matched = nonStones.slice();
      break;
    }
    case "Four of a Kind":
      matched = pickByGroupSize(nonStones, 4);
      break;
    case "Three of a Kind":
      matched = pickByGroupSize(nonStones, 3);
      break;
    case "Two Pair":
      matched = pickAllGroupsOfSize(nonStones, 2);
      break;
    case "Pair":
      matched = pickByGroupSize(nonStones, 2);
      break;
    case "High Card":
      matched = nonStones.length === 0 ? [] : [pickHighestCard(nonStones)];
      break;
  }

  const includedIds = new Set([
    ...matched.map((c) => c.id),
    ...stones.map((c) => c.id),
  ]);
  return cards.filter((c) => includedIds.has(c.id));
}

function pickFlushCards(
  cards: ReadonlyArray<Card>,
  options: HandEvalOptions,
): Card[] {
  const anchor = flushAnchorSuit(cards, options);
  if (anchor === null) return cards.slice();
  const smear = options.smearedSuits === true;
  return cards.filter((c) => {
    const s = cardSuitForEvaluation(c);
    return s === null || mergedSuit(s, smear) === anchor;
  });
}

function pickStraightCards(
  cards: ReadonlyArray<Card>,
  options: HandEvalOptions,
): Card[] {
  const run = straightRunValues(cards, options);
  if (run === null) return cards.slice();
  const valueSet = new Set<number>(run);
  const aceLow = valueSet.has(1);
  const seenRanks = new Set<number>();
  const result: Card[] = [];
  for (const c of cards) {
    const v = RANK_ORDER[c.rank];
    const matched = valueSet.has(v) || (aceLow && v === 14);
    if (!matched) continue;
    const key = aceLow && v === 14 ? 1 : v;
    if (seenRanks.has(key)) continue;
    seenRanks.add(key);
    result.push(c);
  }
  return result;
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

export interface ScoringStep {
  readonly card: Card;
  readonly chips: number;
}

export function getScoringStep(
  cards: ReadonlyArray<Card>,
  index: number,
): ScoringStep {
  if (index < 0 || index >= cards.length) {
    throw new RangeError(
      `Scoring step index ${index} is out of bounds for a sequence of length ${cards.length}`,
    );
  }
  const card = cards[index];
  return { card, chips: getCardChips(card) };
}

export function forEachScoringStep(
  cards: ReadonlyArray<Card>,
  step: (entry: ScoringStep, index: number) => void,
): void {
  for (let i = 0; i < cards.length; i++) {
    step(getScoringStep(cards, i), i);
  }
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
    (sum, card) => sum + getCardChips(card),
    0,
  );
  const cardMultDelta = scoringCards.reduce(
    (sum, card) => sum + getCardMultDelta(card),
    0,
  );
  const cardMultTimes = scoringCards.reduce(
    (m, card) => m * getCardMultTimes(card),
    1,
  );
  return Math.floor(
    (hand.chips + cardChips) * (hand.multiplier + cardMultDelta) * cardMultTimes,
  );
}
