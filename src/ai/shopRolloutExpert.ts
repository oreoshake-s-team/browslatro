import { MAX_JOKERS } from "../items/jokers/constants";
import type { Joker } from "../items/jokers/types";
import { applyPlanetUpgrade } from "../items/planets";
import type { ShopItem } from "../items/shop";
import type { HandStats } from "../scoring/handStats";
import { playHeadlessRun, type HeadlessAgent } from "./headlessRun";

export interface RolloutOptions {
  readonly agent: HeadlessAgent;
  readonly horizonAntes: number;
  readonly rollouts: number;
  readonly maxAnte: number;
}

export interface PostShopState {
  readonly jokers: ReadonlyArray<Joker>;
  readonly money: number;
  readonly handStats: HandStats;
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
      maxAnte: horizon,
    });
    total += result.blindsCleared;
  }
  return total / opts.rollouts;
}

export function applyOfferToState(
  offer: ShopItem,
  state: PostShopState,
): PostShopState | null {
  if (offer.price > state.money) return null;
  if (offer.kind === "joker") {
    if (state.jokers.length >= MAX_JOKERS) return null;
    return {
      jokers: [...state.jokers, offer.joker],
      money: state.money - offer.price,
      handStats: state.handStats,
    };
  }
  if (offer.kind === "planet") {
    return {
      jokers: state.jokers,
      money: state.money - offer.price,
      handStats: applyPlanetUpgrade(state.handStats, offer.planet),
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
    const post = applyOfferToState(offers[i], state);
    if (post === null) continue;
    const value = await rolloutValue(ante, post, opts, seedBase + (i + 1) * 104729);
    if (value > bestValue) {
      bestValue = value;
      index = i;
    }
  }
  return { index, leaveValue, bestValue };
}
