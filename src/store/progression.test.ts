import { beforeEach, describe, expect, test } from "vitest";
import { useGame } from "./game";

describe("progression store", () => {
  beforeEach(() => {
    useGame.getState().resetProgression();
  });

  test("starts at blind 1", () => {
    expect(useGame.getState().blind).toBe(1);
  });

  test("starts with the blind-select screen pending", () => {
    expect(useGame.getState().pendingBlindSelect).toBe(true);
  });

  test("setRound accepts an updater function", () => {
    useGame.getState().setRound((prev) => prev + 1);
    expect(useGame.getState().round).toBe(2);
  });

  test("setPendingTags accepts an updater function", () => {
    useGame.getState().setPendingTags((prev) => [...prev, "investment"]);
    expect(useGame.getState().pendingTags).toContain("investment");
  });

  test("setPendingBlindSelect accepts a plain value", () => {
    useGame.getState().setPendingBlindSelect(false);
    expect(useGame.getState().pendingBlindSelect).toBe(false);
  });

  test("resetProgression restores the starting ante", () => {
    useGame.getState().setAnte(5);
    useGame.getState().resetProgression();
    expect(useGame.getState().ante).toBe(1);
  });
});
