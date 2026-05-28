import type { StateCreator } from "zustand";
import type { GameState } from "./game";

export const STARTING_MONEY = 4;

export interface EconomyState {
  money: number;
  earn: (amount: number) => void;
  spend: (amount: number) => boolean;
  setMoney: (amount: number) => void;
  resetEconomy: () => void;
}

export const createEconomySlice: StateCreator<GameState, [], [], EconomyState> = (set, get) => ({
  money: STARTING_MONEY,
  earn: (amount) => set((state) => ({ money: state.money + amount })),
  spend: (amount) => {
    if (get().money < amount) return false;
    set((state) => ({ money: state.money - amount }));
    return true;
  },
  setMoney: (amount) => set({ money: Math.max(0, amount) }),
  resetEconomy: () => set({ money: STARTING_MONEY }),
});
