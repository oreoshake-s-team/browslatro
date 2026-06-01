import type { StateCreator } from "zustand";
import type { GameState } from "./game";

export interface AnimationsState {
  nopeTriggerKey: number;
  triggerNope: () => void;
  resetAnimations: () => void;
}

export const createAnimationsSlice: StateCreator<
  GameState,
  [],
  [],
  AnimationsState
> = (set) => ({
  nopeTriggerKey: 0,
  triggerNope: () =>
    set((state) => ({ nopeTriggerKey: state.nopeTriggerKey + 1 })),
  resetAnimations: () => set({ nopeTriggerKey: 0 }),
});
