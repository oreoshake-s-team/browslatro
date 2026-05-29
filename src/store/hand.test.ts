import { beforeEach, describe, expect, test } from "vitest";
import { useGame } from "./game";
import { STARTING_HANDS, STARTING_DISCARDS } from "./hand";

describe("hand store", () => {
  beforeEach(() => {
    useGame.getState().resetHand();
  });

  test("starts with the starting hand count", () => {
    expect(useGame.getState().remainingHands).toBe(STARTING_HANDS);
  });

  test("starts with the starting discard count", () => {
    expect(useGame.getState().remainingDiscards).toBe(STARTING_DISCARDS);
  });

  test("starts with no selected cards", () => {
    expect(useGame.getState().selectedIds.size).toBe(0);
  });

  test("setRemainingDiscards accepts an updater function", () => {
    useGame.getState().setRemainingDiscards((prev) => prev - 1);
    expect(useGame.getState().remainingDiscards).toBe(STARTING_DISCARDS - 1);
  });

  test("setSelectedIds accepts a plain value", () => {
    useGame.getState().setSelectedIds(new Set([1, 2]));
    expect(useGame.getState().selectedIds.has(2)).toBe(true);
  });

  test("resetHand clears the selection", () => {
    useGame.getState().setSelectedIds(new Set([1, 2]));
    useGame.getState().resetHand();
    expect(useGame.getState().selectedIds.size).toBe(0);
  });
});
