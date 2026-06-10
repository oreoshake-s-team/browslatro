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
import { DEFAULT_DECK, type Deck } from "../items/decks";
import type { Rank, Suit } from "../cards/types";

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
  grosMichelDestroyed: boolean;
  idolTarget: { readonly rank: Rank; readonly suit: Suit } | null;
  ancientSuit: Suit | null;
  castleSuit: Suit | null;
  selectedStake: Stake;
  selectedDeck: Deck;
  setRunStats: (update: Updater<RunStats>) => void;
  setSkipTagOffers: (update: Updater<AnteSkipOffers>) => void;
  setPendingShopMods: (update: Updater<ReadonlyArray<NextShopModifier>>) => void;
  setPendingNextRoundHandSize: (update: Updater<number>) => void;
  setPendingDouble: (update: Updater<boolean>) => void;
  setGrosMichelDestroyed: (update: Updater<boolean>) => void;
  setIdolTarget: (
    update: Updater<{ readonly rank: Rank; readonly suit: Suit } | null>,
  ) => void;
  setAncientSuit: (update: Updater<Suit | null>) => void;
  setCastleSuit: (update: Updater<Suit | null>) => void;
  setSelectedStake: (update: Updater<Stake>) => void;
  setSelectedDeck: (update: Updater<Deck>) => void;
  resetRun: () => void;
}

export const createRunSlice: StateCreator<GameState, [], [], RunState> = (set) => ({
  runStats: initialRunStats(),
  skipTagOffers: freshSkipOffers(),
  pendingShopMods: [],
  pendingNextRoundHandSize: 0,
  pendingDouble: false,
  grosMichelDestroyed: false,
  idolTarget: null,
  ancientSuit: null,
  castleSuit: null,
  selectedStake: DEFAULT_STAKE,
  selectedDeck: DEFAULT_DECK,
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
  setGrosMichelDestroyed: (update) =>
    set((state) => ({
      grosMichelDestroyed: resolve(update, state.grosMichelDestroyed),
    })),
  setIdolTarget: (update) =>
    set((state) => ({ idolTarget: resolve(update, state.idolTarget) })),
  setAncientSuit: (update) =>
    set((state) => ({ ancientSuit: resolve(update, state.ancientSuit) })),
  setCastleSuit: (update) =>
    set((state) => ({ castleSuit: resolve(update, state.castleSuit) })),
  setSelectedStake: (update) =>
    set((state) => ({ selectedStake: resolve(update, state.selectedStake) })),
  setSelectedDeck: (update) =>
    set((state) => ({ selectedDeck: resolve(update, state.selectedDeck) })),
  resetRun: () =>
    set({
      runStats: initialRunStats(),
      skipTagOffers: freshSkipOffers(),
      pendingShopMods: [],
      pendingNextRoundHandSize: 0,
      pendingDouble: false,
      grosMichelDestroyed: false,
      idolTarget: null,
      ancientSuit: null,
      castleSuit: null,
      selectedStake: DEFAULT_STAKE,
      selectedDeck: DEFAULT_DECK,
    }),
});
