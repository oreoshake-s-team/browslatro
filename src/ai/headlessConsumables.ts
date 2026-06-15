import { HAND_SIZE, RANKS } from "../cards/deck";
import {
  applyEditionOverrides,
  applyEnhancementOverrides,
  applySealOverrides,
} from "../cards/deckBuild";
import { rollCardEdition } from "../cards/editions";
import type { Card } from "../cards/types";
import type { Consumable } from "../items/consumables";
import { createRandomJoker } from "../items/jokers/collection";
import type { Joker } from "../items/jokers/types";
import { applyPlanetUpgrade, type PlanetCard } from "../items/planets";
import { pickRandom } from "../items/random";
import {
  nextRankUp,
  resolveTemperancePayout,
  type TarotCard,
  type TarotEffect,
} from "../items/tarots";
import {
  duplicateSelectedInHand,
  transmuteHand,
  type SpectralEffect,
} from "../items/spectrals";
import type { HandStats } from "../scoring/handStats";

const MAX_CONSUMABLE_DEPTH = 3;

export interface ConsumableContext {
  readonly deck: ReadonlyArray<Card>;
  readonly money: number;
  readonly jokers: ReadonlyArray<Joker>;
  readonly jokerCatalog: ReadonlyArray<Joker>;
  readonly jokerCapacity: number;
}

export interface ConsumableResult {
  readonly deck: ReadonlyArray<Card>;
  readonly money: number;
  readonly createdJoker?: Joker;
  readonly createConsumables?: { readonly consumableKind: "tarot" | "planet"; readonly count: number };
  readonly copyLastConsumable?: boolean;
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
      const overrides = new Map([[id, rollCardEdition(rng)]]);
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
    case "create-joker": {
      const createdJoker = createRandomJoker(
        ctx.jokers,
        ctx.jokerCatalog,
        ctx.jokerCapacity,
        rng,
      );
      return createdJoker === null ? { deck, money } : { deck, money, createdJoker };
    }
    case "create-consumables":
      return { deck, money, createConsumables: { consumableKind: effect.consumableKind, count: effect.count } };
    case "copy-last-consumable":
      return { deck, money, copyLastConsumable: true };
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
      const overrides = new Map([[id, rollCardEdition(rng)]]);
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

export interface ConsumableApplyState {
  readonly deck: ReadonlyArray<Card>;
  readonly money: number;
  readonly handStats: HandStats;
  readonly lastConsumable: Consumable | null;
  readonly createdJokers: ReadonlyArray<Joker>;
}

export interface ConsumableDeps {
  readonly jokers: ReadonlyArray<Joker>;
  readonly jokerCatalog: ReadonlyArray<Joker>;
  readonly jokerCapacity: number;
  readonly tarotCatalog: ReadonlyArray<TarotCard>;
  readonly planetCatalog: ReadonlyArray<PlanetCard>;
}

function createConsumable(
  kind: "tarot" | "planet",
  sourceTarotId: string,
  deps: ConsumableDeps,
  rng: () => number,
): Consumable | null {
  if (kind === "planet") {
    const card = pickRandom(deps.planetCatalog, rng);
    return card === undefined ? null : { kind: "planet", card };
  }
  const card = pickRandom(deps.tarotCatalog.filter((t) => t.id !== sourceTarotId), rng);
  return card === undefined ? null : { kind: "tarot", card };
}

export function applyConsumable(
  state: ConsumableApplyState,
  consumable: Consumable,
  deps: ConsumableDeps,
  rng: () => number,
  depth = 0,
): ConsumableApplyState {
  const ctx: ConsumableContext = {
    deck: state.deck,
    money: state.money,
    jokers: [...deps.jokers, ...state.createdJokers],
    jokerCatalog: deps.jokerCatalog,
    jokerCapacity: deps.jokerCapacity,
  };
  if (consumable.kind === "planet") {
    return { ...state, handStats: applyPlanetUpgrade(state.handStats, consumable.card), lastConsumable: consumable };
  }
  if (consumable.kind === "spectral") {
    const { deck, money } = applySpectralEffectToDeck(ctx, consumable.card.effect, rng);
    return { ...state, deck, money, lastConsumable: consumable };
  }
  const result = applyTarotEffectToDeck(ctx, consumable.card.effect, rng);
  let next: ConsumableApplyState = {
    ...state,
    deck: result.deck,
    money: result.money,
    createdJokers:
      result.createdJoker === undefined
        ? state.createdJokers
        : [...state.createdJokers, result.createdJoker],
  };
  if (result.createConsumables !== undefined && depth < MAX_CONSUMABLE_DEPTH) {
    for (let i = 0; i < result.createConsumables.count; i += 1) {
      const created = createConsumable(result.createConsumables.consumableKind, consumable.card.id, deps, rng);
      if (created !== null) next = applyConsumable(next, created, deps, rng, depth + 1);
    }
  }
  if (result.copyLastConsumable === true && depth < MAX_CONSUMABLE_DEPTH) {
    const previous = state.lastConsumable;
    if (previous !== null && !(previous.kind === "tarot" && previous.card.id === "the-fool")) {
      next = applyConsumable(next, previous, deps, rng, depth + 1);
    }
  }
  return { ...next, lastConsumable: consumable };
}
