import { RANKS } from "../cards/deck";
import {
  applyEditionOverrides,
  applyEnhancementOverrides,
  applySealOverrides,
} from "../cards/deckBuild";
import { pickRandomCardEdition } from "../cards/editions";
import type { Card } from "../cards/types";
import type { Joker } from "../items/jokers/types";
import {
  nextRankUp,
  resolveTemperancePayout,
  type TarotEffect,
} from "../items/tarots";
import type { SpectralEffect } from "../items/spectrals";

export interface ConsumableContext {
  readonly deck: ReadonlyArray<Card>;
  readonly money: number;
  readonly jokers: ReadonlyArray<Joker>;
}

export interface ConsumableResult {
  readonly deck: ReadonlyArray<Card>;
  readonly money: number;
}

function topCardIds(deck: ReadonlyArray<Card>, count: number): number[] {
  return [...deck]
    .sort((a, b) => RANKS.indexOf(b.rank) - RANKS.indexOf(a.rank))
    .slice(0, count)
    .map((c) => c.id);
}

export function applyTarotEffectToDeck(
  ctx: ConsumableContext,
  effect: TarotEffect,
  rng: () => number,
): ConsumableResult {
  const { deck, money } = ctx;
  switch (effect.kind) {
    case "apply-enhancement": {
      const overrides = new Map(
        topCardIds(deck, effect.maxTargets).map((id) => [id, effect.enhancement]),
      );
      return { deck: applyEnhancementOverrides(deck, overrides), money };
    }
    case "rank-up-selected": {
      const ids = new Set(topCardIds(deck, effect.maxTargets));
      return {
        deck: deck.map((c) => (ids.has(c.id) ? { ...c, rank: nextRankUp(c.rank) } : c)),
        money,
      };
    }
    case "convert-suit": {
      const ids = new Set(topCardIds(deck, effect.maxTargets));
      return {
        deck: deck.map((c) => (ids.has(c.id) ? { ...c, suit: effect.suit } : c)),
        money,
      };
    }
    case "edition-roll": {
      const [id] = topCardIds(deck, 1);
      if (id === undefined || rng() >= effect.chance) return { deck, money };
      const overrides = new Map([[id, pickRandomCardEdition(rng)]]);
      return { deck: applyEditionOverrides(deck, overrides), money };
    }
    case "money-multiply": {
      const gain = Math.min(
        Math.floor(money * (effect.multiplier - 1)),
        effect.bonusCap,
      );
      return { deck, money: money + gain };
    }
    case "joker-sell-value-payout":
      return { deck, money: money + resolveTemperancePayout(ctx.jokers, effect.cap) };
    default:
      return { deck, money };
  }
}

export function applySpectralEffectToDeck(
  ctx: ConsumableContext,
  effect: SpectralEffect,
  rng: () => number,
): ConsumableResult {
  const { deck, money } = ctx;
  switch (effect.kind) {
    case "apply-seal": {
      const [id] = topCardIds(deck, 1);
      if (id === undefined) return { deck, money };
      return { deck: applySealOverrides(deck, new Map([[id, effect.seal]])), money };
    }
    case "aura": {
      const [id] = topCardIds(deck, 1);
      if (id === undefined) return { deck, money };
      const overrides = new Map([[id, pickRandomCardEdition(rng)]]);
      return { deck: applyEditionOverrides(deck, overrides), money };
    }
    default:
      return { deck, money };
  }
}
