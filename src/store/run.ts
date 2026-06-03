import type { StateCreator } from "zustand";
import type { GameState } from "./game";
import {
  rollAnteSkipOffers,
  tagOfferRngConfig,
  type AnteSkipOffers,
} from "../items/tags";
import { initialRunStats, type RunStats } from "../run/runStats";
import type { NextShopModifier } from "../run/nextShopMods";
import { DEFAULT_STAKE, type Stake } from "../items/stakes";

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
  pendingNextRoundHandSize: number;
  pendingDouble: boolean;
  selectedStake: Stake;
  setRunStats: (update: Updater<RunStats>) => void;
  setSkipTagOffers: (update: Updater<AnteSkipOffers>) => void;
  setPendingShopMods: (update: Updater<ReadonlyArray<NextShopModifier>>) => void;
  setPendingNextRoundHandSize: (update: Updater<number>) => void;
  setPendingDouble: (update: Updater<boolean>) => void;
  setSelectedStake: (update: Updater<Stake>) => void;
  resetRun: () => void;
}

export const createRunSlice: StateCreator<GameState, [], [], RunState> = (set) => ({
  runStats: initialRunStats(),
  skipTagOffers: freshSkipOffers(),
  pendingShopMods: [],
  pendingNextRoundHandSize: 0,
  pendingDouble: false,
  selectedStake: DEFAULT_STAKE,
  setRunStats: (update) =>
    set((state) => ({ runStats: resolve(update, state.runStats) })),
  setSkipTagOffers: (update) =>
    set((state) => ({ skipTagOffers: resolve(update, state.skipTagOffers) })),
  setPendingShopMods: (update) =>
    set((state) => ({ pendingShopMods: resolve(update, state.pendingShopMods) })),
  setPendingNextRoundHandSize: (update) =>
    set((state) => ({
      pendingNextRoundHandSize: resolve(update, state.pendingNextRoundHandSize),
    })),
  setPendingDouble: (update) =>
    set((state) => ({ pendingDouble: resolve(update, state.pendingDouble) })),
  setSelectedStake: (update) =>
    set((state) => ({ selectedStake: resolve(update, state.selectedStake) })),
  resetRun: () =>
    set({
      runStats: initialRunStats(),
      skipTagOffers: freshSkipOffers(),
      pendingShopMods: [],
      pendingNextRoundHandSize: 0,
      pendingDouble: false,
      selectedStake: DEFAULT_STAKE,
    }),
});
