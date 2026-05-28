import { create } from "zustand";
import type { VoucherId } from "../items/vouchers";

export const BASE_VOUCHER_SLOTS = 1;

type Updater<T> = T | ((prev: T) => T);

function resolve<T>(update: Updater<T>, prev: T): T {
  return typeof update === "function"
    ? (update as (prev: T) => T)(prev)
    : update;
}

export interface VouchersState {
  ownedVoucherIds: ReadonlySet<VoucherId>;
  extraVoucherSlots: number;
  soldVoucherIds: ReadonlySet<VoucherId>;
  setOwnedVoucherIds: (update: Updater<ReadonlySet<VoucherId>>) => void;
  setExtraVoucherSlots: (update: Updater<number>) => void;
  setSoldVoucherIds: (update: Updater<ReadonlySet<VoucherId>>) => void;
  resetVouchers: () => void;
}

export const useVouchers = create<VouchersState>()((set) => ({
  ownedVoucherIds: new Set(),
  extraVoucherSlots: 0,
  soldVoucherIds: new Set(),
  setOwnedVoucherIds: (update) =>
    set((state) => ({ ownedVoucherIds: resolve(update, state.ownedVoucherIds) })),
  setExtraVoucherSlots: (update) =>
    set((state) => ({ extraVoucherSlots: resolve(update, state.extraVoucherSlots) })),
  setSoldVoucherIds: (update) =>
    set((state) => ({ soldVoucherIds: resolve(update, state.soldVoucherIds) })),
  resetVouchers: () =>
    set({
      ownedVoucherIds: new Set(),
      extraVoucherSlots: 0,
      soldVoucherIds: new Set(),
    }),
}));
