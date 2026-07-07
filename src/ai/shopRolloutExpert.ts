import type { Card } from "../cards/types";
import { MAX_CONSUMABLE_SLOTS, type Consumable } from "../items/consumables";
import { MAX_JOKERS } from "../items/jokers/constants";
import { canAddJokerToRow } from "../items/jokers/collection";
import type { Joker } from "../items/jokers/types";
import { applyPlanetUpgrade, type PlanetCard } from "../items/planets";
import type { ShopItem } from "../items/shop";
import type { TarotCard } from "../items/tarots";
import type { HandStats } from "../scoring/handStats";
import { applyConsumable } from "./headlessConsumables";
import { playHeadlessRun, seededRng, type HeadlessAgent, type HeadlessShopAgent } from "./headlessRun";

export interface ConsumableLabelDeps {
  readonly jokerCatalog: ReadonlyArray<Joker>;
  readonly planetCatalog: ReadonlyArray<PlanetCard>;
  readonly tarotCatalog: ReadonlyArray<TarotCard>;
}

export interface RolloutOptions {
  readonly agent: HeadlessAgent;
  readonly horizonAntes: number;
  readonly rollouts: number;
  readonly maxAnte: number;
  readonly consumableDeps?: ConsumableLabelDeps;
  readonly rolloutShopAgent?: HeadlessShopAgent;
  readonly winBonus?: number;
}

export interface PostShopState {
  readonly jokers: ReadonlyArray<Joker>;
  readonly money: number;
  readonly handStats: HandStats;
  readonly deck: ReadonlyArray<Card>;
  readonly consumables?: ReadonlyArray<Consumable>;
}

export async function rolloutValue(
  ante: number,
  state: PostShopState,
  opts: RolloutOptions,
  seedBase: number,
): Promise<number> {
  const horizon = Math.min(opts.maxAnte, ante + opts.horizonAntes);
  let total = 0;
  for (let i = 0; i < opts.rollouts; i += 1) {
    const result = await playHeadlessRun(opts.agent, {
      seed: seedBase + i * 7919,
      startAnte: ante + 1,
      startMoney: state.money,
      startHandStats: state.handStats,
      jokers: state.jokers,
      startDeck: state.deck,
      maxAnte: horizon,
      shopAgent: opts.rolloutShopAgent,
    });
    total += result.blindsCleared + (result.won ? (opts.winBonus ?? 0) : 0);
  }
  return total / opts.rollouts;
}

export function applyOfferToState(
  offer: ShopItem,
  state: PostShopState,
  deps?: ConsumableLabelDeps,
  rng: () => number = Math.random,
): PostShopState | null {
  if (offer.price > state.money) return null;
  if (offer.kind === "joker") {
    if (!canAddJokerToRow(state.jokers, offer.joker, MAX_JOKERS)) return null;
    return {
      jokers: [...state.jokers, offer.joker],
      money: state.money - offer.price,
      handStats: state.handStats,
      deck: state.deck,
    };
  }
  if (offer.kind === "planet") {
    return {
      jokers: state.jokers,
      money: state.money - offer.price,
      handStats: applyPlanetUpgrade(state.handStats, offer.planet),
      deck: state.deck,
    };
  }
  if ((offer.kind === "tarot" || offer.kind === "spectral") && deps !== undefined) {
    const consumable: Consumable =
      offer.kind === "tarot"
        ? { kind: "tarot", card: offer.tarot }
        : { kind: "spectral", card: offer.spectral };
    const result = applyConsumable(
      {
        deck: state.deck,
        money: state.money - offer.price,
        handStats: state.handStats,
        lastConsumable: null,
        createdJokers: [],
      },
      consumable,
      {
        jokers: state.jokers,
        jokerCatalog: deps.jokerCatalog,
        jokerCapacity: MAX_JOKERS,
        tarotCatalog: deps.tarotCatalog,
        planetCatalog: deps.planetCatalog,
      },
      rng,
    );
    if (state.jokers.length + result.createdJokers.length > MAX_JOKERS) return null;
    return {
      jokers: [...state.jokers, ...result.createdJokers],
      money: result.money,
      handStats: result.handStats,
      deck: result.deck,
    };
  }
  return null;
}

export function applyConsumableToState(
  consumable: Consumable,
  state: PostShopState,
  deps: ConsumableLabelDeps,
  rng: () => number,
): PostShopState | null {
  if (consumable.kind === "planet") {
    return { ...state, handStats: applyPlanetUpgrade(state.handStats, consumable.card) };
  }
  const result = applyConsumable(
    {
      deck: state.deck,
      money: state.money,
      handStats: state.handStats,
      lastConsumable: null,
      createdJokers: [],
    },
    consumable,
    {
      jokers: state.jokers,
      jokerCatalog: deps.jokerCatalog,
      jokerCapacity: MAX_JOKERS,
      tarotCatalog: deps.tarotCatalog,
      planetCatalog: deps.planetCatalog,
    },
    rng,
  );
  if (state.jokers.length + result.createdJokers.length > MAX_JOKERS) return null;
  return {
    ...state,
    jokers: [...state.jokers, ...result.createdJokers],
    money: result.money,
    handStats: result.handStats,
    deck: result.deck,
  };
}

export function useHeldConsumable(
  index: number,
  state: PostShopState,
  deps: ConsumableLabelDeps,
  rng: () => number,
): PostShopState | null {
  const held = state.consumables ?? [];
  const consumable = held[index];
  if (consumable === undefined) return null;
  const applied = applyConsumableToState(consumable, state, deps, rng);
  if (applied === null) return null;
  return { ...applied, consumables: held.filter((_, i) => i !== index) };
}

export function flushHeldConsumables(
  state: PostShopState,
  deps: ConsumableLabelDeps,
  rng: () => number,
): PostShopState {
  let current = state;
  for (;;) {
    const held = current.consumables ?? [];
    if (held.length === 0) return current;
    const next = useHeldConsumable(0, current, deps, rng);
    current = next ?? { ...current, consumables: held.slice(1) };
  }
}

export function buyOfferToHold(
  offer: ShopItem,
  state: PostShopState,
  deps: ConsumableLabelDeps,
  rng: () => number,
): PostShopState | null {
  if (offer.price > state.money) return null;
  if (offer.kind === "planet" || offer.kind === "tarot" || offer.kind === "spectral") {
    const consumable: Consumable =
      offer.kind === "planet"
        ? { kind: "planet", card: offer.planet }
        : offer.kind === "tarot"
          ? { kind: "tarot", card: offer.tarot }
          : { kind: "spectral", card: offer.spectral };
    const held = state.consumables ?? [];
    if (held.length < MAX_CONSUMABLE_SLOTS) {
      return { ...state, money: state.money - offer.price, consumables: [...held, consumable] };
    }
    return applyConsumableToState(
      consumable,
      { ...state, money: state.money - offer.price },
      deps,
      rng,
    );
  }
  const post = applyOfferToState(offer, state, deps, rng);
  if (post === null) return null;
  return { ...post, consumables: state.consumables ?? [] };
}

export interface HeldShopChoice {
  readonly leaveValue: number;
  readonly bestValue: number;
  readonly bestOffer: number;
  readonly bestUse: number;
}

function requireDeps(opts: RolloutOptions): ConsumableLabelDeps {
  if (opts.consumableDeps === undefined) {
    throw new Error("hold-aware shop evaluation requires consumableDeps");
  }
  return opts.consumableDeps;
}

export async function bestShopChoiceHeld(
  ante: number,
  offers: ReadonlyArray<ShopItem>,
  state: PostShopState,
  opts: RolloutOptions,
  seedBase: number,
): Promise<HeldShopChoice> {
  const deps = requireDeps(opts);
  const flushedNow = flushHeldConsumables(state, deps, seededRng(seedBase + 13));
  const leaveValue = await rolloutValue(ante, flushedNow, opts, seedBase);
  let bestValue = leaveValue;
  let bestOffer = -1;
  let bestUse = -1;
  for (let i = 0; i < offers.length; i += 1) {
    const post = buyOfferToHold(offers[i], state, deps, seededRng(seedBase + (i + 1) * 92821));
    if (post === null) continue;
    const flushed = flushHeldConsumables(post, deps, seededRng(seedBase + (i + 1) * 92821 + 1));
    const value = await rolloutValue(ante, flushed, opts, seedBase + (i + 1) * 104729);
    if (value > bestValue) {
      bestValue = value;
      bestOffer = i;
      bestUse = -1;
    }
  }
  const held = state.consumables ?? [];
  for (let k = 0; k < held.length; k += 1) {
    const post = useHeldConsumable(k, state, deps, seededRng(seedBase + (k + 1) * 15485863));
    if (post === null) continue;
    const flushed = flushHeldConsumables(post, deps, seededRng(seedBase + (k + 1) * 15485863 + 1));
    const value = await rolloutValue(ante, flushed, opts, seedBase + (k + 1) * 24036583);
    if (value > bestValue) {
      bestValue = value;
      bestOffer = -1;
      bestUse = k;
    }
  }
  return { leaveValue, bestValue, bestOffer, bestUse };
}

export async function bestHeldUse(
  ante: number,
  state: PostShopState,
  opts: RolloutOptions,
  seedBase: number,
): Promise<number> {
  const deps = requireDeps(opts);
  const held = state.consumables ?? [];
  let bestUse = 0;
  let bestValue = -Infinity;
  for (let k = 0; k < held.length; k += 1) {
    const post = useHeldConsumable(k, state, deps, seededRng(seedBase + (k + 1) * 15485863));
    if (post === null) continue;
    const flushed = flushHeldConsumables(post, deps, seededRng(seedBase + (k + 1) * 15485863 + 1));
    const value = await rolloutValue(ante, flushed, opts, seedBase + (k + 1) * 24036583);
    if (value > bestValue) {
      bestValue = value;
      bestUse = k;
    }
  }
  return bestUse;
}

export interface ShopChoice {
  readonly index: number;
  readonly leaveValue: number;
  readonly bestValue: number;
}

export async function bestShopChoice(
  ante: number,
  offers: ReadonlyArray<ShopItem>,
  state: PostShopState,
  opts: RolloutOptions,
  seedBase: number,
): Promise<ShopChoice> {
  const leaveValue = await rolloutValue(ante, state, opts, seedBase);
  let index = offers.length;
  let bestValue = leaveValue;
  for (let i = 0; i < offers.length; i += 1) {
    const offerRng = seededRng(seedBase + (i + 1) * 92821);
    const post = applyOfferToState(offers[i], state, opts.consumableDeps, offerRng);
    if (post === null) continue;
    const value = await rolloutValue(ante, post, opts, seedBase + (i + 1) * 104729);
    if (value > bestValue) {
      bestValue = value;
      index = i;
    }
  }
  return { index, leaveValue, bestValue };
}
