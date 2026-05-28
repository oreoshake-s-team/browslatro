import { create } from "zustand";
import { emptyHandCounts, type HandPlayCounts } from "../components/hud/RunInfo";
import { createDefaultHandStats, type HandStats } from "../scoring/handStats";

type Updater<T> = T | ((prev: T) => T);

function resolve<T>(update: Updater<T>, prev: T): T {
  return typeof update === "function"
    ? (update as (prev: T) => T)(prev)
    : update;
}

export interface StatsState {
  handPlayCounts: HandPlayCounts;
  handStats: HandStats;
  handPlaySignal: number;
  setHandPlayCounts: (update: Updater<HandPlayCounts>) => void;
  setHandStats: (update: Updater<HandStats>) => void;
  setHandPlaySignal: (update: Updater<number>) => void;
  resetStats: () => void;
}

export const useStats = create<StatsState>()((set) => ({
  handPlayCounts: emptyHandCounts(),
  handStats: createDefaultHandStats(),
  handPlaySignal: 0,
  setHandPlayCounts: (update) =>
    set((state) => ({ handPlayCounts: resolve(update, state.handPlayCounts) })),
  setHandStats: (update) =>
    set((state) => ({ handStats: resolve(update, state.handStats) })),
  setHandPlaySignal: (update) =>
    set((state) => ({ handPlaySignal: resolve(update, state.handPlaySignal) })),
  resetStats: () =>
    set({
      handPlayCounts: emptyHandCounts(),
      handStats: createDefaultHandStats(),
    }),
}));
