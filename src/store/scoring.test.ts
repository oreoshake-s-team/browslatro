import { beforeEach, describe, expect, test } from "vitest";
import { useGame } from "./game";

describe("scoring store", () => {
  beforeEach(() => {
    useGame.getState().resetScoring();
  });

  test("starts with zero chips", () => {
    expect(useGame.getState().chips).toBe(0);
  });

  test("starts with no scoring events", () => {
    expect(useGame.getState().scoringEvents).toHaveLength(0);
  });

  test("setChips accepts an updater function", () => {
    useGame.getState().setChips((prev) => prev + 11);
    expect(useGame.getState().chips).toBe(11);
  });

  test("setMultiplier accepts an updater function", () => {
    useGame.getState().setMultiplier(2);
    useGame.getState().setMultiplier((prev) => prev * 3);
    expect(useGame.getState().multiplier).toBe(6);
  });

  test("setScoringEvents accepts an updater function", () => {
    useGame.getState().setScoringEvents((prev) => [
      ...prev,
      { kind: "chips-delta", amount: 5, source: "test" },
    ]);
    expect(useGame.getState().scoringEvents).toHaveLength(1);
  });

  test("resetScoring clears the round score", () => {
    useGame.getState().setRoundScore(500);
    useGame.getState().resetScoring();
    expect(useGame.getState().roundScore).toBe(0);
  });

  test("setScoringIndex accepts an updater function", () => {
    useGame.getState().setScoringIndex((prev) => prev + 1);
    expect(useGame.getState().scoringIndex).toBe(1);
  });

  test("setLuckyMultProcIds accepts a plain value", () => {
    useGame.getState().setLuckyMultProcIds(new Set([7]));
    expect(useGame.getState().luckyMultProcIds.has(7)).toBe(true);
  });

  test("resetScoring clears the gold scoring queue", () => {
    useGame.getState().setGoldScoringIds([1, 2]);
    useGame.getState().resetScoring();
    expect(useGame.getState().goldScoringIds).toHaveLength(0);
  });
});
