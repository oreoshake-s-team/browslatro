import type { StateCreator } from "zustand";
import type { GameState } from "./game";
import type { Blind } from "../cards/types";
import type { TagId } from "../items/tags";

type Updater<T> = T | ((prev: T) => T);

function resolve<T>(update: Updater<T>, prev: T): T {
  return typeof update === "function"
    ? (update as (prev: T) => T)(prev)
    : update;
}

export interface GameWonInfo {
  readonly finalAnte: number;
  readonly finalMoney: number;
  readonly handsPlayed: number;
  readonly blindsSkipped: number;
}

export interface ProgressionState {
  blind: Blind;
  round: number;
  ante: number;
  pendingBlindSelect: boolean;
  pendingRunSelect: boolean;
  pendingTags: ReadonlyArray<TagId>;
  pendingGameWon: GameWonInfo | null;
  endlessMode: boolean;
  setBlind: (update: Updater<Blind>) => void;
  setRound: (update: Updater<number>) => void;
  setAnte: (update: Updater<number>) => void;
  setPendingBlindSelect: (update: Updater<boolean>) => void;
  setPendingRunSelect: (update: Updater<boolean>) => void;
  setPendingTags: (update: Updater<ReadonlyArray<TagId>>) => void;
  setPendingGameWon: (update: Updater<GameWonInfo | null>) => void;
  setEndlessMode: (update: Updater<boolean>) => void;
  resetProgression: () => void;
}

export const createProgressionSlice: StateCreator<GameState, [], [], ProgressionState> = (set) => ({
  blind: 1,
  round: 1,
  ante: 1,
  pendingBlindSelect: true,
  pendingRunSelect: true,
  pendingTags: [],
  pendingGameWon: null,
  endlessMode: false,
  setBlind: (update) => set((state) => ({ blind: resolve(update, state.blind) })),
  setRound: (update) => set((state) => ({ round: resolve(update, state.round) })),
  setAnte: (update) => set((state) => ({ ante: resolve(update, state.ante) })),
  setPendingBlindSelect: (update) =>
    set((state) => ({
      pendingBlindSelect: resolve(update, state.pendingBlindSelect),
    })),
  setPendingRunSelect: (update) =>
    set((state) => ({
      pendingRunSelect: resolve(update, state.pendingRunSelect),
    })),
  setPendingTags: (update) =>
    set((state) => ({ pendingTags: resolve(update, state.pendingTags) })),
  setPendingGameWon: (update) =>
    set((state) => ({ pendingGameWon: resolve(update, state.pendingGameWon) })),
  setEndlessMode: (update) =>
    set((state) => ({ endlessMode: resolve(update, state.endlessMode) })),
  resetProgression: () =>
    set({
      blind: 1,
      round: 1,
      ante: 1,
      pendingBlindSelect: true,
      pendingRunSelect: true,
      pendingTags: [],
      pendingGameWon: null,
      endlessMode: false,
    }),
});
