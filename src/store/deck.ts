import { create } from "zustand";
import type { DealResult } from "../cards/deck";
import type { Card, Enhancement, Seal } from "../cards/types";

type Updater<T> = T | ((prev: T) => T);

function resolve<T>(update: Updater<T>, prev: T): T {
  return typeof update === "function"
    ? (update as (prev: T) => T)(prev)
    : update;
}

function emptyDeck() {
  return {
    dealt: { hand: [], remaining: [] } as DealResult,
    destroyedCardKeys: new Set<string>() as ReadonlySet<string>,
    addedCards: [] as ReadonlyArray<Card>,
    cardEnhancementsByKey: new Map<string, Enhancement>() as ReadonlyMap<
      string,
      Enhancement
    >,
    cardSealsByKey: new Map<string, Seal>() as ReadonlyMap<string, Seal>,
  };
}

export interface DeckState {
  dealt: DealResult;
  destroyedCardKeys: ReadonlySet<string>;
  addedCards: ReadonlyArray<Card>;
  cardEnhancementsByKey: ReadonlyMap<string, Enhancement>;
  cardSealsByKey: ReadonlyMap<string, Seal>;
  setDealt: (update: Updater<DealResult>) => void;
  setDestroyedCardKeys: (update: Updater<ReadonlySet<string>>) => void;
  setAddedCards: (update: Updater<ReadonlyArray<Card>>) => void;
  setCardEnhancementsByKey: (
    update: Updater<ReadonlyMap<string, Enhancement>>,
  ) => void;
  setCardSealsByKey: (update: Updater<ReadonlyMap<string, Seal>>) => void;
  resetDeck: () => void;
}

export const useDeck = create<DeckState>()((set) => ({
  ...emptyDeck(),
  setDealt: (update) => set((state) => ({ dealt: resolve(update, state.dealt) })),
  setDestroyedCardKeys: (update) =>
    set((state) => ({
      destroyedCardKeys: resolve(update, state.destroyedCardKeys),
    })),
  setAddedCards: (update) =>
    set((state) => ({ addedCards: resolve(update, state.addedCards) })),
  setCardEnhancementsByKey: (update) =>
    set((state) => ({
      cardEnhancementsByKey: resolve(update, state.cardEnhancementsByKey),
    })),
  setCardSealsByKey: (update) =>
    set((state) => ({ cardSealsByKey: resolve(update, state.cardSealsByKey) })),
  resetDeck: () => set(emptyDeck()),
}));
