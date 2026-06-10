import type { Card, Rank, Suit } from "../cards/types";
import type { HandLabel } from "../scoring/handEvaluator";
import {
  MAX_PLAYED_CARDS,
  simulatePlay,
  type SimulatePlayInput,
} from "./simulatePlay";

export type HandOptionNote =
  | { readonly kind: "best-immediate-score" }
  | { readonly kind: "best-of-hand-type" }
  | { readonly kind: "commits-to-flush-build"; readonly suit: Suit }
  | { readonly kind: "keeps-paired-ranks"; readonly ranks: ReadonlyArray<Rank> };

export interface PlayOption {
  readonly action: "play";
  readonly cardIds: ReadonlyArray<number>;
  readonly handLabel: HandLabel;
  readonly score: number;
  readonly chips: number;
  readonly mult: number;
  readonly notes: ReadonlyArray<HandOptionNote>;
}

export interface DiscardOption {
  readonly action: "discard";
  readonly cardIds: ReadonlyArray<number>;
  readonly notes: ReadonlyArray<HandOptionNote>;
}

export type HandOption = PlayOption | DiscardOption;

export const DEFAULT_TOP_N = 5;

function* combinations(
  ids: ReadonlyArray<number>,
  size: number,
): Generator<number[]> {
  if (size > ids.length) return;
  const indices = Array.from({ length: size }, (_, i) => i);
  while (true) {
    yield indices.map((i) => ids[i]);
    let pivot = size - 1;
    while (pivot >= 0 && indices[pivot] === ids.length - size + pivot) {
      pivot -= 1;
    }
    if (pivot < 0) return;
    indices[pivot] += 1;
    for (let i = pivot + 1; i < size; i += 1) {
      indices[i] = indices[i - 1] + 1;
    }
  }
}

function bestPlayPerLabel(
  input: SimulatePlayInput,
): Map<HandLabel, Omit<PlayOption, "notes">> {
  const handIds = input.dealt.hand.map((c) => c.id);
  const maxSize = Math.min(MAX_PLAYED_CARDS, handIds.length);
  const best = new Map<HandLabel, Omit<PlayOption, "notes">>();
  for (let size = 1; size <= maxSize; size += 1) {
    for (const cardIds of combinations(handIds, size)) {
      const result = simulatePlay(input, cardIds);
      if (!result.legal) continue;
      const current = best.get(result.handLabel);
      if (current !== undefined && current.score >= result.score) continue;
      best.set(result.handLabel, {
        action: "play",
        cardIds,
        handLabel: result.handLabel,
        score: result.score,
        chips: result.chips,
        mult: result.mult,
      });
    }
  }
  return best;
}

const RANK_VALUE: Record<Rank, number> = {
  "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9,
  "10": 10, J: 11, Q: 12, K: 13, A: 14,
};

function lowestFirst(cards: ReadonlyArray<Card>): Card[] {
  return [...cards].sort((a, b) => RANK_VALUE[a.rank] - RANK_VALUE[b.rank]);
}

function flushBuildDiscard(hand: ReadonlyArray<Card>): DiscardOption | null {
  const counts = new Map<Suit, number>();
  for (const card of hand) {
    counts.set(card.suit, (counts.get(card.suit) ?? 0) + 1);
  }
  let majoritySuit: Suit | null = null;
  let majorityCount = 0;
  for (const [suit, count] of counts) {
    if (count > majorityCount) {
      majoritySuit = suit;
      majorityCount = count;
    }
  }
  if (majoritySuit === null || majorityCount < 3 || majorityCount >= 5) {
    return null;
  }
  const offSuit = lowestFirst(hand.filter((c) => c.suit !== majoritySuit));
  if (offSuit.length === 0) return null;
  return {
    action: "discard",
    cardIds: offSuit.slice(0, MAX_PLAYED_CARDS).map((c) => c.id),
    notes: [{ kind: "commits-to-flush-build", suit: majoritySuit }],
  };
}

function pairedRanksDiscard(hand: ReadonlyArray<Card>): DiscardOption | null {
  const counts = new Map<Rank, number>();
  for (const card of hand) {
    counts.set(card.rank, (counts.get(card.rank) ?? 0) + 1);
  }
  const pairedRanks = [...counts.entries()]
    .filter(([, count]) => count >= 2)
    .map(([rank]) => rank);
  if (pairedRanks.length === 0) return null;
  const singletons = lowestFirst(
    hand.filter((c) => counts.get(c.rank) === 1),
  );
  if (singletons.length === 0) return null;
  return {
    action: "discard",
    cardIds: singletons.slice(0, MAX_PLAYED_CARDS).map((c) => c.id),
    notes: [{ kind: "keeps-paired-ranks", ranks: pairedRanks }],
  };
}

export function getHandOptions(
  input: SimulatePlayInput,
  topN: number = DEFAULT_TOP_N,
): ReadonlyArray<HandOption> {
  const plays = [...bestPlayPerLabel(input).values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(0, topN))
    .map((option, index) => ({
      ...option,
      notes: [
        index === 0
          ? ({ kind: "best-immediate-score" } as const)
          : ({ kind: "best-of-hand-type" } as const),
      ],
    }));

  const discards: DiscardOption[] = [];
  if (input.remainingDiscards > 0) {
    const flush = flushBuildDiscard(input.dealt.hand);
    if (flush !== null) discards.push(flush);
    const paired = pairedRanksDiscard(input.dealt.hand);
    if (
      paired !== null &&
      !discards.some(
        (d) => d.cardIds.join(",") === paired.cardIds.join(","),
      )
    ) {
      discards.push(paired);
    }
  }

  return [...plays, ...discards];
}
