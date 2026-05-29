import type { StateCreator } from "zustand";
import type { GameState } from "./game";

type Updater<T> = T | ((prev: T) => T);

function resolve<T>(update: Updater<T>, prev: T): T {
  return typeof update === "function"
    ? (update as (prev: T) => T)(prev)
    : update;
}

export interface DevModifiersState {
  devChipsBonus: number;
  devMultBonus: number;
  devMultFactor: number;
  forceProbabilities: boolean;
  setDevChipsBonus: (update: Updater<number>) => void;
  setDevMultBonus: (update: Updater<number>) => void;
  setDevMultFactor: (update: Updater<number>) => void;
  setForceProbabilities: (update: Updater<boolean>) => void;
  resetDevModifiers: () => void;
}

export const createDevModifiersSlice: StateCreator<GameState, [], [], DevModifiersState> = (set) => ({
  devChipsBonus: 0,
  devMultBonus: 0,
  devMultFactor: 1,
  forceProbabilities: false,
  setDevChipsBonus: (update) =>
    set((state) => ({ devChipsBonus: resolve(update, state.devChipsBonus) })),
  setDevMultBonus: (update) =>
    set((state) => ({ devMultBonus: resolve(update, state.devMultBonus) })),
  setDevMultFactor: (update) =>
    set((state) => ({ devMultFactor: resolve(update, state.devMultFactor) })),
  setForceProbabilities: (update) =>
    set((state) => ({
      forceProbabilities: resolve(update, state.forceProbabilities),
    })),
  resetDevModifiers: () =>
    set({
      devChipsBonus: 0,
      devMultBonus: 0,
      devMultFactor: 1,
      forceProbabilities: false,
    }),
});
