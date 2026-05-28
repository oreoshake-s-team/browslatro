import { beforeEach, describe, expect, test } from "vitest";
import { useHand, STARTING_HANDS, STARTING_DISCARDS } from "./hand";

describe("hand store", () => {
  beforeEach(() => {
    useHand.getState().resetHand();
  });

  test("starts with the starting hand count", () => {
    expect(useHand.getState().remainingHands).toBe(STARTING_HANDS);
  });

  test("starts with the starting discard count", () => {
    expect(useHand.getState().remainingDiscards).toBe(STARTING_DISCARDS);
  });

  test("starts with no selected cards", () => {
    expect(useHand.getState().selectedIds.size).toBe(0);
  });

  test("setRemainingDiscards accepts an updater function", () => {
    useHand.getState().setRemainingDiscards((prev) => prev - 1);
    expect(useHand.getState().remainingDiscards).toBe(STARTING_DISCARDS - 1);
  });

  test("setSelectedIds accepts a plain value", () => {
    useHand.getState().setSelectedIds(new Set([1, 2]));
    expect(useHand.getState().selectedIds.has(2)).toBe(true);
  });

  test("resetHand clears the selection", () => {
    useHand.getState().setSelectedIds(new Set([1, 2]));
    useHand.getState().resetHand();
    expect(useHand.getState().selectedIds.size).toBe(0);
  });
});
