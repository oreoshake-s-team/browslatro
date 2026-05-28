import { beforeEach, describe, expect, test } from "vitest";
import { useScoring } from "./scoring";

describe("scoring store", () => {
  beforeEach(() => {
    useScoring.getState().resetScoring();
  });

  test("starts with zero chips", () => {
    expect(useScoring.getState().chips).toBe(0);
  });

  test("starts with no scoring events", () => {
    expect(useScoring.getState().scoringEvents).toHaveLength(0);
  });

  test("setChips accepts an updater function", () => {
    useScoring.getState().setChips((prev) => prev + 11);
    expect(useScoring.getState().chips).toBe(11);
  });

  test("setMultiplier accepts an updater function", () => {
    useScoring.getState().setMultiplier(2);
    useScoring.getState().setMultiplier((prev) => prev * 3);
    expect(useScoring.getState().multiplier).toBe(6);
  });

  test("setScoringEvents accepts an updater function", () => {
    useScoring.getState().setScoringEvents((prev) => [
      ...prev,
      { kind: "chips-delta", amount: 5, source: "test" },
    ]);
    expect(useScoring.getState().scoringEvents).toHaveLength(1);
  });

  test("resetScoring clears the round score", () => {
    useScoring.getState().setRoundScore(500);
    useScoring.getState().resetScoring();
    expect(useScoring.getState().roundScore).toBe(0);
  });
});
