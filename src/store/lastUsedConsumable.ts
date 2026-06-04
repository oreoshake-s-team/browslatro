import type { StateCreator } from "zustand";
import type { GameState } from "./game";
import type { Consumable } from "../items/consumables";

export interface LastUsedConsumableState {
  lastUsedConsumable: Consumable | null;
  setLastUsedConsumable: (c: Consumable | null) => void;
  resetLastUsedConsumable: () => void;
}

export const createLastUsedConsumableSlice: StateCreator<
  GameState,
  [],
  [],
  LastUsedConsumableState
> = (set) => ({
  lastUsedConsumable: null,
  setLastUsedConsumable: (c) => set({ lastUsedConsumable: c }),
  resetLastUsedConsumable: () => set({ lastUsedConsumable: null }),
});
