import type { Card } from "../../../cards/types";
import type { Joker } from "../types";
import { resolveJokerEffect } from "./copy";
import { isFaceCardWith } from "./utils";
import { isJokerActive } from "../stickers";

export interface RetriggerContext {
  readonly remainingHands?: number;
}

export function expandScoringRetriggers(
  cards: ReadonlyArray<Card>,
  allJokers: ReadonlyArray<Joker>,
  context: RetriggerContext = {},
): Card[] {
  const jokers = allJokers.filter(isJokerActive);
  const out: Card[] = [];
  cards.forEach((card, cardIndex) => {
    let extra = card.seal === "red" ? 1 : 0;
    for (let i = 0; i < jokers.length; i += 1) {
      const effect = resolveJokerEffect(jokers, i);
      switch (effect.kind) {
        case "retrigger-ranks": {
          if (effect.ranks.includes(card.rank)) extra += effect.times;
          break;
        }
        case "retrigger-face-cards": {
          if (isFaceCardWith(card, jokers)) extra += effect.times;
          break;
        }
        case "retrigger-first-card": {
          if (cardIndex === 0) extra += effect.times;
          break;
        }
        case "retrigger-on-final-hand": {
          if (context.remainingHands === 1) extra += effect.times;
          break;
        }
        case "retrigger-all-depleting": {
          const state = jokers[i].state;
          const remaining = state?.kind === "counter" ? state.value : 0;
          if (remaining > 0) extra += effect.times;
          break;
        }
        default:
          break;
      }
    }
    for (let copy = 0; copy <= extra; copy += 1) out.push(card);
  });
  return out;
}
