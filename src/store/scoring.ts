import { create } from "zustand";
import type { ScoringEvent } from "../scoring/scoringTrace";

type Updater<T> = T | ((prev: T) => T);

function resolve<T>(update: Updater<T>, prev: T): T {
  return typeof update === "function"
    ? (update as (prev: T) => T)(prev)
    : update;
}

export interface ScoringState {
  chips: number;
  multiplier: number;
  roundScore: number;
  scoringEvents: ReadonlyArray<ScoringEvent>;
  setChips: (update: Updater<number>) => void;
  setMultiplier: (update: Updater<number>) => void;
  setRoundScore: (update: Updater<number>) => void;
  setScoringEvents: (update: Updater<ReadonlyArray<ScoringEvent>>) => void;
  resetScoring: () => void;
}

export const useScoring = create<ScoringState>()((set) => ({
  chips: 0,
  multiplier: 0,
  roundScore: 0,
  scoringEvents: [],
  setChips: (update) => set((state) => ({ chips: resolve(update, state.chips) })),
  setMultiplier: (update) =>
    set((state) => ({ multiplier: resolve(update, state.multiplier) })),
  setRoundScore: (update) =>
    set((state) => ({ roundScore: resolve(update, state.roundScore) })),
  setScoringEvents: (update) =>
    set((state) => ({ scoringEvents: resolve(update, state.scoringEvents) })),
  resetScoring: () =>
    set({ chips: 0, multiplier: 0, roundScore: 0, scoringEvents: [] }),
}));
