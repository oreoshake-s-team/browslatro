import type { StateCreator } from "zustand";
import type { GameState } from "./game";
import type { DealResult } from "../cards/deck";
import type { Card, CardEdition, Enhancement, Seal } from "../cards/types";

type Updater<T> = T | ((prev: T) => T);

function resolve<T>(update: Updater<T>, prev: T): T {
  return typeof update === "function"
    ? (update as (prev: T) => T)(prev)
    : update;
}

function emptyDeck() {
  return {
    baseDeckCards: [] as ReadonlyArray<Card>,
    dealt: { hand: [], remaining: [] } as DealResult,
    destroyedCardIds: new Set<number>() as ReadonlySet<number>,
    addedCards: [] as ReadonlyArray<Card>,
    cardEnhancementsById: new Map<number, Enhancement | null>() as ReadonlyMap<
      number,
      Enhancement | null
    >,
    cardSealsById: new Map<number, Seal>() as ReadonlyMap<number, Seal>,
    cardEditionsById: new Map<number, CardEdition>() as ReadonlyMap<
      number,
      CardEdition
    >,
  };
}

export interface DeckState {
  baseDeckCards: ReadonlyArray<Card>;
  dealt: DealResult;
  destroyedCardIds: ReadonlySet<number>;
  addedCards: ReadonlyArray<Card>;
  cardEnhancementsById: ReadonlyMap<number, Enhancement | null>;
  cardSealsById: ReadonlyMap<number, Seal>;
  cardEditionsById: ReadonlyMap<number, CardEdition>;
  setBaseDeckCards: (update: Updater<ReadonlyArray<Card>>) => void;
  setDealt: (update: Updater<DealResult>) => void;
  setDestroyedCardIds: (update: Updater<ReadonlySet<number>>) => void;
  setAddedCards: (update: Updater<ReadonlyArray<Card>>) => void;
  setCardEnhancementsById: (
    update: Updater<ReadonlyMap<number, Enhancement | null>>,
  ) => void;
  setCardSealsById: (update: Updater<ReadonlyMap<number, Seal>>) => void;
  setCardEditionsById: (
    update: Updater<ReadonlyMap<number, CardEdition>>,
  ) => void;
  resetDeck: () => void;
}

export const createDeckSlice: StateCreator<GameState, [], [], DeckState> = (set) => ({
  ...emptyDeck(),
  setBaseDeckCards: (update) =>
    set((state) => ({ baseDeckCards: resolve(update, state.baseDeckCards) })),
  setDealt: (update) => set((state) => ({ dealt: resolve(update, state.dealt) })),
  setDestroyedCardIds: (update) =>
    set((state) => ({
      destroyedCardIds: resolve(update, state.destroyedCardIds),
    })),
  setAddedCards: (update) =>
    set((state) => ({ addedCards: resolve(update, state.addedCards) })),
  setCardEnhancementsById: (update) =>
    set((state) => ({
      cardEnhancementsById: resolve(update, state.cardEnhancementsById),
    })),
  setCardSealsById: (update) =>
    set((state) => ({ cardSealsById: resolve(update, state.cardSealsById) })),
  setCardEditionsById: (update) =>
    set((state) => ({
      cardEditionsById: resolve(update, state.cardEditionsById),
    })),
  resetDeck: () => set(emptyDeck()),
});
