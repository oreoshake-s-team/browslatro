import type { Card } from "../../../cards/types";
import type { HandLabel } from "../../../scoring/handEvaluator";
import { handContains } from "../../../scoring/handEvaluator";
import { rollChance } from "../../../dev/chanceOverride";
import type { Joker, RandomSource } from "../types";
import { isJokerActive } from "../stickers";

export interface HandPlayedCreationsContext {
  readonly playedHandLabel: HandLabel;
  readonly playedCards: ReadonlyArray<Card>;
  readonly scoredCards: ReadonlyArray<Card>;
  readonly isFirstHandOfRound: boolean;
  readonly money: number;
  readonly rng?: RandomSource;
}

export interface HandPlayedCreations {
  readonly tarots: number;
  readonly spectrals: number;
  readonly destroyedCardId: number | null;
}

export function consumableCreationsOnHandPlayed(
  allJokers: ReadonlyArray<Joker>,
  ctx: HandPlayedCreationsContext,
): HandPlayedCreations {
  const jokers = allJokers.filter(isJokerActive);
  const rng = ctx.rng ?? Math.random;
  let tarots = 0;
  let spectrals = 0;
  let destroyedCardId: number | null = null;
  for (const joker of jokers) {
    const effect = joker.effect;
    switch (effect.kind) {
      case "scored-rank-chance-creates-tarot": {
        for (const card of ctx.scoredCards) {
          if (card.rank !== effect.rank) continue;
          if (rollChance(effect.chance, rng)) tarots += 1;
        }
        break;
      }
      case "hand-type-creates-spectral": {
        if (ctx.playedHandLabel === effect.requires) spectrals += 1;
        break;
      }
      case "first-hand-single-six-creates-spectral": {
        if (
          ctx.isFirstHandOfRound &&
          ctx.playedCards.length === 1 &&
          ctx.playedCards[0].rank === "6"
        ) {
          spectrals += 1;
          destroyedCardId = ctx.playedCards[0].id;
        }
        break;
      }
      case "ace-straight-creates-tarot": {
        if (
          handContains(ctx.playedHandLabel, "Straight") &&
          ctx.scoredCards.some((c) => c.rank === "A")
        ) {
          tarots += 1;
        }
        break;
      }
      case "poor-hand-creates-tarot": {
        if (ctx.money <= effect.threshold) tarots += 1;
        break;
      }
      default:
        break;
    }
  }
  return { tarots, spectrals, destroyedCardId };
}
