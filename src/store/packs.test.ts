import { beforeEach, describe, expect, test } from "vitest";
import { useGame } from "./game";

describe("packs store", () => {
  beforeEach(() => {
    useGame.getState().resetPacks();
  });

  test("starts with no opened pack", () => {
    expect(useGame.getState().openedPack).toBeNull();
  });

  test("starts with zero pack picks remaining", () => {
    expect(useGame.getState().packPicksRemaining).toBe(0);
  });

  test("setPackPicksRemaining accepts an updater function", () => {
    useGame.getState().setPackPicksRemaining(3);
    useGame.getState().setPackPicksRemaining((prev) => prev - 1);
    expect(useGame.getState().packPicksRemaining).toBe(2);
  });

  test("setPendingForcedPacks accepts an updater function", () => {
    useGame.getState().setPendingForcedPacks((prev) => [...prev, "arcana"]);
    expect(useGame.getState().pendingForcedPacks).toContain("arcana");
  });

  test("resetPacks clears pending forced packs", () => {
    useGame.getState().setPendingForcedPacks(["arcana", "spectral"]);
    useGame.getState().resetPacks();
    expect(useGame.getState().pendingForcedPacks).toHaveLength(0);
  });

  test("starts with no picked pack option indices", () => {
    expect(useGame.getState().pickedPackOptionIndices.size).toBe(0);
  });

  test("setPickedPackOptionIndices accepts an updater function", () => {
    useGame.getState().setPickedPackOptionIndices((prev) => {
      const next = new Set(prev);
      next.add(2);
      return next;
    });
    expect(useGame.getState().pickedPackOptionIndices.has(2)).toBe(true);
  });

  test("resetPacks clears picked pack option indices", () => {
    useGame.getState().setPickedPackOptionIndices(new Set([0, 1]));
    useGame.getState().resetPacks();
    expect(useGame.getState().pickedPackOptionIndices.size).toBe(0);
  });
});
