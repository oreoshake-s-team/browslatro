import type { Card } from "../../cards/types";
import { handContains, type HandLabel } from "../../scoring/handEvaluator";
import { isFaceCardWith } from "./scoring/utils";
import type { Joker, JokerStateValue } from "./types";

function counterState(value: number): JokerStateValue {
  return { kind: "counter", value };
}

function prevCount(joker: Joker): number {
  return joker.state?.kind === "counter" ? joker.state.value : 0;
}

export interface HandPlayedContext {
  readonly playedHandLabel: HandLabel;
  readonly playedCardCount: number;
  readonly scoredCards: ReadonlyArray<Card>;
}

export function applyHandPlayedToJokerStates(
  jokers: ReadonlyArray<Joker>,
  ctx: HandPlayedContext,
): Joker[] {
  return jokers.map((joker) => {
    const effect = joker.effect;
    switch (effect.kind) {
      case "on-hand-type-stack-mult":
      case "on-hand-type-stack-chips": {
        if (!handContains(ctx.playedHandLabel, effect.requires)) return joker;
        return { ...joker, state: counterState(prevCount(joker) + effect.amount) };
      }
      case "on-played-card-count-stack-chips": {
        if (ctx.playedCardCount !== effect.count) return joker;
        return { ...joker, state: counterState(prevCount(joker) + effect.amount) };
      }
      case "on-played-rank-stack-chips": {
        let matches = 0;
        for (const c of ctx.scoredCards) {
          if (effect.ranks.includes(c.rank)) matches += 1;
        }
        if (matches === 0) return joker;
        return {
          ...joker,
          state: counterState(prevCount(joker) + effect.amount * matches),
        };
      }
      case "on-no-face-stack-mult": {
        const anyFace = ctx.scoredCards.some((c) => isFaceCardWith(c, jokers));
        if (anyFace) return { ...joker, state: counterState(0) };
        return { ...joker, state: counterState(prevCount(joker) + effect.amount) };
      }
      case "every-n-hands-xmult": {
        return { ...joker, state: counterState(prevCount(joker) + 1) };
      }
      case "on-hand-stack-on-discard-shrink-mult": {
        return {
          ...joker,
          state: counterState(prevCount(joker) + effect.growAmount),
        };
      }
      default:
        return joker;
    }
  });
}

export function applyDiscardToJokerStates(
  jokers: ReadonlyArray<Joker>,
): Joker[] {
  return jokers.map((joker) => {
    const effect = joker.effect;
    if (effect.kind !== "on-hand-stack-on-discard-shrink-mult") return joker;
    return {
      ...joker,
      state: counterState(Math.max(0, prevCount(joker) - effect.shrinkAmount)),
    };
  });
}

export function applyShopRerollToJokerStates(
  jokers: ReadonlyArray<Joker>,
): Joker[] {
  return jokers.map((joker) => {
    const effect = joker.effect;
    if (effect.kind !== "stack-mult-on-shop-reroll") return joker;
    return { ...joker, state: counterState(prevCount(joker) + effect.amount) };
  });
}
