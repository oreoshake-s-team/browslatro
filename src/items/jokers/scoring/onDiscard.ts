import type { Card, Rank } from "../../../cards/types";
import type { Joker } from "../types";
import { isFaceCardWith } from "./utils";
import { isJokerActive } from "../stickers";
import { resolveJokerEffect } from "./copy";

export interface OnDiscardContext {
  readonly discardsUsedThisRound?: number;
  readonly rebateRank?: Rank | null;
}

export interface OnDiscardStep {
  readonly jokerId: string;
  readonly jokerName: string;
  readonly moneyEarned: number;
  readonly destroyedCardId?: number;
}

export interface OnDiscardResult {
  readonly moneyEarned: number;
  readonly steps: ReadonlyArray<OnDiscardStep>;
}

export function applyOnDiscardJokers(
  allJokers: ReadonlyArray<Joker>,
  discardedCards: ReadonlyArray<Card>,
  context: OnDiscardContext = {},
): OnDiscardResult {
  const jokers = allJokers.filter(isJokerActive);
  let moneyEarned = 0;
  const steps: OnDiscardStep[] = [];
  for (let i = 0; i < jokers.length; i += 1) {
    const joker = jokers[i];
    const effect = resolveJokerEffect(jokers, i);
    if (effect.kind === "on-discard-money-when-face-count-at-least") {
      let faceCount = 0;
      for (const c of discardedCards) {
        if (isFaceCardWith(c, jokers)) faceCount += 1;
      }
      if (faceCount >= effect.threshold) {
        moneyEarned += effect.payout;
        steps.push({
          jokerId: joker.id,
          jokerName: joker.name,
          moneyEarned: effect.payout,
        });
      }
    } else if (effect.kind === "money-per-discarded-rebate-rank") {
      const rank = context.rebateRank;
      if (rank != null) {
        const matches = discardedCards.filter((c) => c.rank === rank).length;
        if (matches > 0) {
          const earned = effect.payout * matches;
          moneyEarned += earned;
          steps.push({
            jokerId: joker.id,
            jokerName: joker.name,
            moneyEarned: earned,
          });
        }
      }
    } else if (effect.kind === "on-first-discard-of-round-money-when-size") {
      const isFirst = (context.discardsUsedThisRound ?? 0) === 1;
      if (isFirst && discardedCards.length === effect.size) {
        moneyEarned += effect.payout;
        steps.push({
          jokerId: joker.id,
          jokerName: joker.name,
          moneyEarned: effect.payout,
          destroyedCardId: discardedCards[0].id,
        });
      }
    }
  }
  return { moneyEarned, steps };
}
