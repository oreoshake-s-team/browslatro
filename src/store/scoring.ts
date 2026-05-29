import type { StateCreator } from "zustand";
import type { GameState } from "./game";
import type { ScoringEvent } from "../scoring/scoringTrace";
import type { Card } from "../cards/types";
import type { JokerHandLevelStep } from "../items/jokers";

type Updater<T> = T | ((prev: T) => T);

function resolve<T>(update: Updater<T>, prev: T): T {
  return typeof update === "function"
    ? (update as (prev: T) => T)(prev)
    : update;
}

export interface ScoringState {
  chips: number;
  multiplier: number;
  roundScore: number;
  scoringEvents: ReadonlyArray<ScoringEvent>;
  scoringCards: ReadonlyArray<Card>;
  scoringIndex: number;
  goldScoringIds: ReadonlyArray<number>;
  goldScoringIndex: number;
  steelScoringIds: ReadonlyArray<number>;
  steelScoringIndex: number;
  luckyMultProcIds: ReadonlySet<number>;
  luckyMoneyProcIds: ReadonlySet<number>;
  handLevelSteps: ReadonlyArray<JokerHandLevelStep>;
  handLevelIndex: number;
  setChips: (update: Updater<number>) => void;
  setMultiplier: (update: Updater<number>) => void;
  setRoundScore: (update: Updater<number>) => void;
  setScoringEvents: (update: Updater<ReadonlyArray<ScoringEvent>>) => void;
  setScoringCards: (update: Updater<ReadonlyArray<Card>>) => void;
  setScoringIndex: (update: Updater<number>) => void;
  setGoldScoringIds: (update: Updater<ReadonlyArray<number>>) => void;
  setGoldScoringIndex: (update: Updater<number>) => void;
  setSteelScoringIds: (update: Updater<ReadonlyArray<number>>) => void;
  setSteelScoringIndex: (update: Updater<number>) => void;
  setLuckyMultProcIds: (update: Updater<ReadonlySet<number>>) => void;
  setLuckyMoneyProcIds: (update: Updater<ReadonlySet<number>>) => void;
  setHandLevelSteps: (update: Updater<ReadonlyArray<JokerHandLevelStep>>) => void;
  setHandLevelIndex: (update: Updater<number>) => void;
  resetScoring: () => void;
}

function createInitialAnimation() {
  return {
    scoringCards: [] as ReadonlyArray<Card>,
    scoringIndex: 0,
    goldScoringIds: [] as ReadonlyArray<number>,
    goldScoringIndex: 0,
    steelScoringIds: [] as ReadonlyArray<number>,
    steelScoringIndex: 0,
    luckyMultProcIds: new Set<number>() as ReadonlySet<number>,
    luckyMoneyProcIds: new Set<number>() as ReadonlySet<number>,
    handLevelSteps: [] as ReadonlyArray<JokerHandLevelStep>,
    handLevelIndex: 0,
  };
}

export const createScoringSlice: StateCreator<GameState, [], [], ScoringState> = (set) => ({
  chips: 0,
  multiplier: 0,
  roundScore: 0,
  scoringEvents: [],
  ...createInitialAnimation(),
  setChips: (update) => set((state) => ({ chips: resolve(update, state.chips) })),
  setMultiplier: (update) =>
    set((state) => ({ multiplier: resolve(update, state.multiplier) })),
  setRoundScore: (update) =>
    set((state) => ({ roundScore: resolve(update, state.roundScore) })),
  setScoringEvents: (update) =>
    set((state) => ({ scoringEvents: resolve(update, state.scoringEvents) })),
  setScoringCards: (update) =>
    set((state) => ({ scoringCards: resolve(update, state.scoringCards) })),
  setScoringIndex: (update) =>
    set((state) => ({ scoringIndex: resolve(update, state.scoringIndex) })),
  setGoldScoringIds: (update) =>
    set((state) => ({ goldScoringIds: resolve(update, state.goldScoringIds) })),
  setGoldScoringIndex: (update) =>
    set((state) => ({
      goldScoringIndex: resolve(update, state.goldScoringIndex),
    })),
  setSteelScoringIds: (update) =>
    set((state) => ({ steelScoringIds: resolve(update, state.steelScoringIds) })),
  setSteelScoringIndex: (update) =>
    set((state) => ({
      steelScoringIndex: resolve(update, state.steelScoringIndex),
    })),
  setLuckyMultProcIds: (update) =>
    set((state) => ({
      luckyMultProcIds: resolve(update, state.luckyMultProcIds),
    })),
  setLuckyMoneyProcIds: (update) =>
    set((state) => ({
      luckyMoneyProcIds: resolve(update, state.luckyMoneyProcIds),
    })),
  setHandLevelSteps: (update) =>
    set((state) => ({ handLevelSteps: resolve(update, state.handLevelSteps) })),
  setHandLevelIndex: (update) =>
    set((state) => ({ handLevelIndex: resolve(update, state.handLevelIndex) })),
  resetScoring: () =>
    set({
      chips: 0,
      multiplier: 0,
      roundScore: 0,
      scoringEvents: [],
      ...createInitialAnimation(),
    }),
});
