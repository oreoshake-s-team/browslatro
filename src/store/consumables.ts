import { create } from "zustand";
import type { Consumable } from "../items/consumables";

type Updater<T> = T | ((prev: T) => T);

function resolve<T>(update: Updater<T>, prev: T): T {
  return typeof update === "function"
    ? (update as (prev: T) => T)(prev)
    : update;
}

export interface ConsumablesState {
  consumables: ReadonlyArray<Consumable>;
  draggingConsumableIndex: number | null;
  setConsumables: (update: Updater<ReadonlyArray<Consumable>>) => void;
  setDraggingConsumableIndex: (update: Updater<number | null>) => void;
  resetConsumables: () => void;
}

export const useConsumables = create<ConsumablesState>()((set) => ({
  consumables: [],
  draggingConsumableIndex: null,
  setConsumables: (update) =>
    set((state) => ({ consumables: resolve(update, state.consumables) })),
  setDraggingConsumableIndex: (update) =>
    set((state) => ({
      draggingConsumableIndex: resolve(update, state.draggingConsumableIndex),
    })),
  resetConsumables: () => set({ consumables: [], draggingConsumableIndex: null }),
}));
