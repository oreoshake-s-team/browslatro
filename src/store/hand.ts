import type { StateCreator } from "zustand";
import type { GameState } from "./game";
import type { Hand } from "../cards/types";

export const STARTING_HANDS = 4;
export const STARTING_DISCARDS = 3;

type Updater<T> = T | ((prev: T) => T);

function resolve<T>(update: Updater<T>, prev: T): T {
  return typeof update === "function"
    ? (update as (prev: T) => T)(prev)
    : update;
}

export interface HandState {
  selectedHand: Hand | null;
  selectedIds: ReadonlySet<number>;
  discardingIds: ReadonlySet<number>;
  handDisplayOrder: ReadonlyArray<number>;
  remainingHands: number;
  remainingDiscards: number;
  setSelectedHand: (update: Updater<Hand | null>) => void;
  setSelectedIds: (update: Updater<ReadonlySet<number>>) => void;
  setDiscardingIds: (update: Updater<ReadonlySet<number>>) => void;
  setHandDisplayOrder: (update: Updater<ReadonlyArray<number>>) => void;
  setRemainingHands: (update: Updater<number>) => void;
  setRemainingDiscards: (update: Updater<number>) => void;
  resetHand: () => void;
}

export const createHandSlice: StateCreator<GameState, [], [], HandState> = (set) => ({
  selectedHand: null,
  selectedIds: new Set(),
  discardingIds: new Set(),
  handDisplayOrder: [],
  remainingHands: STARTING_HANDS,
  remainingDiscards: STARTING_DISCARDS,
  setSelectedHand: (update) =>
    set((state) => ({ selectedHand: resolve(update, state.selectedHand) })),
  setSelectedIds: (update) =>
    set((state) => ({ selectedIds: resolve(update, state.selectedIds) })),
  setDiscardingIds: (update) =>
    set((state) => ({ discardingIds: resolve(update, state.discardingIds) })),
  setHandDisplayOrder: (update) =>
    set((state) => ({
      handDisplayOrder: resolve(update, state.handDisplayOrder),
    })),
  setRemainingHands: (update) =>
    set((state) => ({ remainingHands: resolve(update, state.remainingHands) })),
  setRemainingDiscards: (update) =>
    set((state) => ({
      remainingDiscards: resolve(update, state.remainingDiscards),
    })),
  resetHand: () =>
    set({
      selectedHand: null,
      selectedIds: new Set(),
      discardingIds: new Set(),
      handDisplayOrder: [],
      remainingHands: STARTING_HANDS,
      remainingDiscards: STARTING_DISCARDS,
    }),
});
