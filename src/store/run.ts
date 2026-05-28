import { create } from "zustand";
import {
  rollAnteSkipOffers,
  tagOfferRngConfig,
  type AnteSkipOffers,
} from "../items/tags";
import { initialRunStats, type RunStats } from "../run/runStats";
import type { NextShopModifier } from "../run/nextShopMods";

type Updater<T> = T | ((prev: T) => T);

function resolve<T>(update: Updater<T>, prev: T): T {
  return typeof update === "function"
    ? (update as (prev: T) => T)(prev)
    : update;
}

function freshSkipOffers(): AnteSkipOffers {
  return rollAnteSkipOffers(tagOfferRngConfig.rng);
}

export interface RunState {
  runStats: RunStats;
  skipTagOffers: AnteSkipOffers;
  pendingShopMods: ReadonlyArray<NextShopModifier>;
  setRunStats: (update: Updater<RunStats>) => void;
  setSkipTagOffers: (update: Updater<AnteSkipOffers>) => void;
  setPendingShopMods: (update: Updater<ReadonlyArray<NextShopModifier>>) => void;
  resetRun: () => void;
}

export const useRun = create<RunState>()((set) => ({
  runStats: initialRunStats(),
  skipTagOffers: freshSkipOffers(),
  pendingShopMods: [],
  setRunStats: (update) =>
    set((state) => ({ runStats: resolve(update, state.runStats) })),
  setSkipTagOffers: (update) =>
    set((state) => ({ skipTagOffers: resolve(update, state.skipTagOffers) })),
  setPendingShopMods: (update) =>
    set((state) => ({ pendingShopMods: resolve(update, state.pendingShopMods) })),
  resetRun: () =>
    set({
      runStats: initialRunStats(),
      skipTagOffers: freshSkipOffers(),
      pendingShopMods: [],
    }),
}));
