import type { StateCreator } from "zustand";
import type { GameState } from "./game";
import { pickBossForAnte, type BossBlind } from "../items/bosses";
import type { HandLabel } from "../scoring/handEvaluator";
import type { RoundWonInfo } from "../components/game/RoundWonModal";

type Updater<T> = T | ((prev: T) => T);

function resolve<T>(update: Updater<T>, prev: T): T {
  return typeof update === "function"
    ? (update as (prev: T) => T)(prev)
    : update;
}

function freshBoss(): BossBlind {
  return pickBossForAnte({ ante: 1 });
}

export interface BossState {
  currentBoss: BossBlind;
  recentBossIds: ReadonlySet<string>;
  handHistoryThisRound: ReadonlyArray<HandLabel>;
  playedCardKeysThisAnte: ReadonlySet<string>;
  pendingWin: RoundWonInfo | null;
  handSizeModifier: number;
  setCurrentBoss: (update: Updater<BossBlind>) => void;
  setRecentBossIds: (update: Updater<ReadonlySet<string>>) => void;
  setHandHistoryThisRound: (update: Updater<ReadonlyArray<HandLabel>>) => void;
  setPlayedCardKeysThisAnte: (update: Updater<ReadonlySet<string>>) => void;
  setPendingWin: (update: Updater<RoundWonInfo | null>) => void;
  setHandSizeModifier: (update: Updater<number>) => void;
  resetBoss: () => void;
}

export const createBossSlice: StateCreator<GameState, [], [], BossState> = (set) => ({
  currentBoss: freshBoss(),
  recentBossIds: new Set(),
  handHistoryThisRound: [],
  playedCardKeysThisAnte: new Set(),
  pendingWin: null,
  handSizeModifier: 0,
  setCurrentBoss: (update) =>
    set((state) => ({ currentBoss: resolve(update, state.currentBoss) })),
  setRecentBossIds: (update) =>
    set((state) => ({ recentBossIds: resolve(update, state.recentBossIds) })),
  setHandHistoryThisRound: (update) =>
    set((state) => ({
      handHistoryThisRound: resolve(update, state.handHistoryThisRound),
    })),
  setPlayedCardKeysThisAnte: (update) =>
    set((state) => ({
      playedCardKeysThisAnte: resolve(update, state.playedCardKeysThisAnte),
    })),
  setPendingWin: (update) =>
    set((state) => ({ pendingWin: resolve(update, state.pendingWin) })),
  setHandSizeModifier: (update) =>
    set((state) => ({ handSizeModifier: resolve(update, state.handSizeModifier) })),
  resetBoss: () =>
    set({
      currentBoss: freshBoss(),
      recentBossIds: new Set(),
      handHistoryThisRound: [],
      playedCardKeysThisAnte: new Set(),
      pendingWin: null,
      handSizeModifier: 0,
    }),
});
