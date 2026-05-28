import { create } from "zustand";
import type { ShopItem } from "../items/shop";

type Updater<T> = T | ((prev: T) => T);

function resolve<T>(update: Updater<T>, prev: T): T {
  return typeof update === "function"
    ? (update as (prev: T) => T)(prev)
    : update;
}

export interface ShopState {
  shopOffers: ReadonlyArray<ShopItem> | null;
  setShopOffers: (update: Updater<ReadonlyArray<ShopItem> | null>) => void;
  resetShop: () => void;
}

export const useShop = create<ShopState>()((set) => ({
  shopOffers: null,
  setShopOffers: (update) =>
    set((state) => ({ shopOffers: resolve(update, state.shopOffers) })),
  resetShop: () => set({ shopOffers: null }),
}));
