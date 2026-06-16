import type { Card } from "../cards/types";
import type { Consumable } from "../items/consumables";
import { MAX_JOKERS } from "../items/jokers/constants";
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
}

export interface PostShopState {
  readonly jokers: ReadonlyArray<Joker>;
  readonly money: number;
  readonly handStats: HandStats;
  readonly deck: ReadonlyArray<Card>;
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
    total += result.blindsCleared;
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
    if (state.jokers.length >= MAX_JOKERS) return null;
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
