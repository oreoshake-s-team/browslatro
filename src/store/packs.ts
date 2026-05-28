import { create } from "zustand";
import type { PackOffer, PackPool } from "../items/packs";
import type { Card } from "../cards/types";

type Updater<T> = T | ((prev: T) => T);

function resolve<T>(update: Updater<T>, prev: T): T {
  return typeof update === "function"
    ? (update as (prev: T) => T)(prev)
    : update;
}

export interface PacksState {
  extraPackSlots: number;
  pendingForcedPacks: ReadonlyArray<PackPool>;
  openedPack: PackOffer | null;
  packPicksRemaining: number;
  packPreviewHand: ReadonlyArray<Card>;
  packPreviewSelectedIds: ReadonlySet<number>;
  setExtraPackSlots: (update: Updater<number>) => void;
  setPendingForcedPacks: (update: Updater<ReadonlyArray<PackPool>>) => void;
  setOpenedPack: (update: Updater<PackOffer | null>) => void;
  setPackPicksRemaining: (update: Updater<number>) => void;
  setPackPreviewHand: (update: Updater<ReadonlyArray<Card>>) => void;
  setPackPreviewSelectedIds: (update: Updater<ReadonlySet<number>>) => void;
  resetPacks: () => void;
}

export const usePacks = create<PacksState>()((set) => ({
  extraPackSlots: 0,
  pendingForcedPacks: [],
  openedPack: null,
  packPicksRemaining: 0,
  packPreviewHand: [],
  packPreviewSelectedIds: new Set(),
  setExtraPackSlots: (update) =>
    set((state) => ({ extraPackSlots: resolve(update, state.extraPackSlots) })),
  setPendingForcedPacks: (update) =>
    set((state) => ({
      pendingForcedPacks: resolve(update, state.pendingForcedPacks),
    })),
  setOpenedPack: (update) =>
    set((state) => ({ openedPack: resolve(update, state.openedPack) })),
  setPackPicksRemaining: (update) =>
    set((state) => ({
      packPicksRemaining: resolve(update, state.packPicksRemaining),
    })),
  setPackPreviewHand: (update) =>
    set((state) => ({ packPreviewHand: resolve(update, state.packPreviewHand) })),
  setPackPreviewSelectedIds: (update) =>
    set((state) => ({
      packPreviewSelectedIds: resolve(update, state.packPreviewSelectedIds),
    })),
  resetPacks: () =>
    set({
      extraPackSlots: 0,
      pendingForcedPacks: [],
      openedPack: null,
      packPicksRemaining: 0,
      packPreviewHand: [],
      packPreviewSelectedIds: new Set(),
    }),
}));
