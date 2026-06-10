import type { Enhancement } from "../../cards/types";
import { ramenXMultFactor } from "./state";
import { jokerSellValue } from "./scoring/utils";
import type { Joker } from "./types";

export interface JokerCurrentValueContext {
  readonly blindsSkipped: number;
  readonly addedCardsCount: number;
  readonly missingDeckCards: number;
  readonly money: number;
  readonly jokerCount: number;
  readonly remainingDiscards: number;
  readonly remainingDeckCards: number;
  readonly matchingEnhancedDeckCards: number;
}

export type JokerCurrentValue =
  | { readonly kind: "mult"; readonly value: number }
  | { readonly kind: "chips"; readonly value: number }
  | { readonly kind: "x-mult"; readonly value: number }
  | { readonly kind: "sell-value"; readonly value: number }
  | { readonly kind: "money"; readonly value: number }
  | { readonly kind: "hand-size"; readonly value: number }
  | { readonly kind: "hands-remaining"; readonly value: number }
  | {
      readonly kind: "hands-until-x-mult";
      readonly hands: number;
      readonly xmult: number;
    };

export function perCountXMultFactor(amount: number, count: number): number {
  return 1 + amount * count;
}

function counterValue(joker: Joker): number {
  return joker.state?.kind === "counter" ? joker.state.value : 0;
}

export function jokerEnhancementFilter(joker: Joker): Enhancement | null {
  const effect = joker.effect;
  if (
    effect.kind === "per-enhanced-in-deck-chips" ||
    effect.kind === "per-enhanced-in-deck-x-mult"
  ) {
    return effect.enhancement;
  }
  return null;
}

export function jokerCurrentValue(
  joker: Joker,
  context: JokerCurrentValueContext,
): JokerCurrentValue | null {
  const effect = joker.effect;
  switch (effect.kind) {
    case "on-hand-type-stack-mult":
    case "on-no-face-stack-mult":
    case "on-hand-stack-on-discard-shrink-mult":
    case "stack-mult-on-shop-reroll":
    case "stack-mult-on-pack-skip":
    case "stack-mult-per-tarot-used":
    case "mult-decay-per-round":
      return { kind: "mult", value: counterValue(joker) };
    case "per-missing-card-mult":
      return { kind: "mult", value: effect.amount * context.missingDeckCards };
    case "per-joker-count-mult":
      return { kind: "mult", value: effect.amount * context.jokerCount };
    case "on-hand-type-stack-chips":
    case "on-played-card-count-stack-chips":
    case "on-played-rank-stack-chips":
    case "stack-chips-per-rotating-suit-discard":
    case "chips-melt-per-hand":
      return { kind: "chips", value: counterValue(joker) };
    case "per-remaining-discard-chips":
      return { kind: "chips", value: effect.amount * context.remainingDiscards };
    case "per-dollar-chips":
      return {
        kind: "chips",
        value: effect.amount * Math.max(0, context.money),
      };
    case "per-remaining-deck-card-chips":
      return {
        kind: "chips",
        value: effect.amount * context.remainingDeckCards,
      };
    case "per-enhanced-in-deck-chips":
      return {
        kind: "chips",
        value: effect.amount * context.matchingEnhancedDeckCards,
      };
    case "per-enhanced-in-deck-x-mult":
      return {
        kind: "x-mult",
        value: perCountXMultFactor(
          effect.amount,
          context.matchingEnhancedDeckCards,
        ),
      };
    case "every-n-hands-xmult":
      return {
        kind: "hands-until-x-mult",
        hands: effect.n - (counterValue(joker) % effect.n),
        xmult: effect.xmult,
      };
    case "x-mult-per-blind-skipped":
      return {
        kind: "x-mult",
        value: perCountXMultFactor(effect.amount, context.blindsSkipped),
      };
    case "x-mult-per-added-card":
      return {
        kind: "x-mult",
        value: perCountXMultFactor(effect.amount, context.addedCardsCount),
      };
    case "x-mult-shrink-per-discarded-card":
      return { kind: "x-mult", value: ramenXMultFactor(joker) };
    case "x-mult-per-jack-discarded-this-round":
    case "x-mult-per-lucky-trigger":
    case "x-mult-per-planet-used":
    case "x-mult-per-sold-card":
    case "x-mult-per-enhancement-eaten":
    case "x-mult-per-glass-shattered":
    case "blind-select-x-mult-destroys-joker":
    case "x-mult-per-face-destroyed":
    case "x-mult-per-hand-without-most-played":
      return {
        kind: "x-mult",
        value: perCountXMultFactor(effect.amount, counterValue(joker)),
      };
    case "sell-value-grows-per-round":
      return { kind: "sell-value", value: jokerSellValue(joker) };
    case "end-of-round-money-grows-on-boss":
      return {
        kind: "money",
        value:
          joker.state?.kind === "counter" ? joker.state.value : effect.baseAmount,
      };
    case "retrigger-all-depleting":
      return {
        kind: "hands-remaining",
        value: joker.state?.kind === "counter" ? joker.state.value : effect.hands,
      };
    case "hand-size-decay-per-round":
      return {
        kind: "hand-size",
        value:
          joker.state?.kind === "counter" ? joker.state.value : effect.amount,
      };
    default:
      return null;
  }
}

export function jokerCurrentValueLabel(value: JokerCurrentValue): string {
  switch (value.kind) {
    case "mult":
      return `Currently: +${value.value} Mult`;
    case "chips":
      return `Currently: +${value.value} Chips`;
    case "x-mult":
      return `Currently: X${formatFactor(value.value)} Mult`;
    case "sell-value":
      return `Currently: $${value.value} sell value`;
    case "money":
      return `Currently: $${value.value} at end of round`;
    case "hand-size":
      return `Currently: +${value.value} hand size`;
    case "hands-remaining":
      return `Currently: ${value.value} ${
        value.value === 1 ? "hand" : "hands"
      } left`;
    case "hands-until-x-mult":
      return `X${value.xmult} Mult in ${value.hands} ${
        value.hands === 1 ? "hand" : "hands"
      }`;
  }
}

function formatFactor(value: number): string {
  return String(Math.round(value * 100) / 100);
}
