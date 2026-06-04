import type { Card } from "../../../cards/types";
import type { Joker } from "../types";
import { isFaceCardWith } from "./utils";

export interface OnDiscardContext {
  readonly discardsUsedThisRound?: number;
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
  jokers: ReadonlyArray<Joker>,
  discardedCards: ReadonlyArray<Card>,
  context: OnDiscardContext = {},
): OnDiscardResult {
  let moneyEarned = 0;
  const steps: OnDiscardStep[] = [];
  for (const joker of jokers) {
    const effect = joker.effect;
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
