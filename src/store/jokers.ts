import { create } from "zustand";
import { initialJokersConfig, type Joker } from "../items/jokers";

type Updater<T> = T | ((prev: T) => T);

function resolve<T>(update: Updater<T>, prev: T): T {
  return typeof update === "function"
    ? (update as (prev: T) => T)(prev)
    : update;
}

export interface JokersState {
  jokers: ReadonlyArray<Joker>;
  jokerPulseCounters: Readonly<Record<string, number>>;
  draggingJokerIndex: number | null;
  soldJokerIdsThisShopVisit: ReadonlyArray<string>;
  setJokers: (update: Updater<ReadonlyArray<Joker>>) => void;
  setJokerPulseCounters: (
    update: Updater<Readonly<Record<string, number>>>,
  ) => void;
  setDraggingJokerIndex: (update: Updater<number | null>) => void;
  setSoldJokerIdsThisShopVisit: (update: Updater<ReadonlyArray<string>>) => void;
  resetJokers: () => void;
}

export const useJokers = create<JokersState>()((set) => ({
  jokers: initialJokersConfig.factory(),
  jokerPulseCounters: {},
  draggingJokerIndex: null,
  soldJokerIdsThisShopVisit: [],
  setJokers: (update) => set((state) => ({ jokers: resolve(update, state.jokers) })),
  setJokerPulseCounters: (update) =>
    set((state) => ({
      jokerPulseCounters: resolve(update, state.jokerPulseCounters),
    })),
  setDraggingJokerIndex: (update) =>
    set((state) => ({
      draggingJokerIndex: resolve(update, state.draggingJokerIndex),
    })),
  setSoldJokerIdsThisShopVisit: (update) =>
    set((state) => ({
      soldJokerIdsThisShopVisit: resolve(update, state.soldJokerIdsThisShopVisit),
    })),
  resetJokers: () =>
    set({
      jokers: initialJokersConfig.factory(),
      jokerPulseCounters: {},
      draggingJokerIndex: null,
      soldJokerIdsThisShopVisit: [],
    }),
}));
