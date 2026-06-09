import type { Card } from "../../../cards/types";
import type { Joker } from "../types";
import { isJokerActive } from "../stickers";

export interface EndOfRoundContext {
  readonly remainingDiscards?: number;
  readonly discardsUsedThisRound?: number;
  readonly fullDeck?: ReadonlyArray<Card>;
}

export interface EndOfRoundStep {
  readonly jokerId: string;
  readonly jokerName: string;
  readonly moneyEarned: number;
}

export interface EndOfRoundResult {
  readonly moneyEarned: number;
  readonly steps: ReadonlyArray<EndOfRoundStep>;
}

export function applyEndOfRoundJokers(
  allJokers: ReadonlyArray<Joker>,
  context: EndOfRoundContext = {},
): EndOfRoundResult {
  const jokers = allJokers.filter(isJokerActive);
  let moneyEarned = 0;
  const steps: EndOfRoundStep[] = [];
  for (const joker of jokers) {
    const effect = joker.effect;
    if (effect.kind === "end-of-round-money") {
      if (effect.amount > 0) {
        moneyEarned += effect.amount;
        steps.push({
          jokerId: joker.id,
          jokerName: joker.name,
          moneyEarned: effect.amount,
        });
      }
    } else if (effect.kind === "per-remaining-discard-end-of-round-money") {
      const used = context.discardsUsedThisRound ?? 0;
      if (used === 0) {
        const discards = Math.max(0, context.remainingDiscards ?? 0);
        const earned = effect.amount * discards;
        if (earned > 0) {
          moneyEarned += earned;
          steps.push({
            jokerId: joker.id,
            jokerName: joker.name,
            moneyEarned: earned,
          });
        }
      }
    } else if (effect.kind === "per-rank-in-deck-end-of-round-money") {
      const deck = context.fullDeck ?? [];
      let matches = 0;
      for (const c of deck) {
        if (effect.ranks.includes(c.rank)) matches += 1;
      }
      const earned = effect.amount * matches;
      if (earned > 0) {
        moneyEarned += earned;
        steps.push({
          jokerId: joker.id,
          jokerName: joker.name,
          moneyEarned: earned,
        });
      }
    }
  }
  return { moneyEarned, steps };
}
