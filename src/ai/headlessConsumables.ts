import { HAND_SIZE, RANKS } from "../cards/deck";
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
import {
  duplicateSelectedInHand,
  transmuteHand,
  type SpectralEffect,
} from "../items/spectrals";

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

function destroyTopCards(deck: ReadonlyArray<Card>, count: number): Card[] {
  const removable = Math.max(0, deck.length - HAND_SIZE);
  const ids = new Set(topCardIds(deck, Math.min(count, removable)));
  return deck.filter((c) => !ids.has(c.id));
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
    case "destroy-selected":
      return { deck: destroyTopCards(deck, effect.maxTargets), money };
    case "death-copy": {
      const ids = topCardIds(deck, effect.requiredTargets);
      if (ids.length < 2) return { deck, money };
      const [leftId, rightId] = ids;
      const right = deck.find((c) => c.id === rightId);
      if (right === undefined) return { deck, money };
      return {
        deck: deck.map((c) => (c.id === leftId ? { ...right, id: leftId } : c)),
        money,
      };
    }
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
    case "immolate":
      return {
        deck: destroyTopCards(deck, effect.destroyCount),
        money: money + effect.moneyGain,
      };
    case "duplicate-selected": {
      const [id] = topCardIds(deck, 1);
      if (id === undefined) return { deck, money };
      const { hand } = duplicateSelectedInHand(deck, new Set([id]), effect.copies);
      return { deck: hand, money };
    }
    case "transmute": {
      const { hand } = transmuteHand(deck, effect.rankFilter, effect.addCount, rng);
      return { deck: hand, money };
    }
    default:
      return { deck, money };
  }
}
