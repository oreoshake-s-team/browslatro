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

  test("starts with the new-run screen pending", () => {
    expect(useGame.getState().pendingRunSelect).toBe(true);
  });

  test("setPendingRunSelect accepts a plain value", () => {
    useGame.getState().setPendingRunSelect(false);
    expect(useGame.getState().pendingRunSelect).toBe(false);
  });

  test("resetProgression re-arms the new-run screen", () => {
    useGame.getState().setPendingRunSelect(false);
    useGame.getState().resetProgression();
    expect(useGame.getState().pendingRunSelect).toBe(true);
  });

  test("starts outside endless mode", () => {
    expect(useGame.getState().endlessMode).toBe(false);
  });

  test("resetProgression turns endless mode off (#855)", () => {
    useGame.getState().setEndlessMode(true);
    useGame.getState().resetProgression();
    expect(useGame.getState().endlessMode).toBe(false);
  });
});
