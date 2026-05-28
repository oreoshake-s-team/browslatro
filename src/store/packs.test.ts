import { beforeEach, describe, expect, test } from "vitest";
import { usePacks } from "./packs";

describe("packs store", () => {
  beforeEach(() => {
    usePacks.getState().resetPacks();
  });

  test("starts with no opened pack", () => {
    expect(usePacks.getState().openedPack).toBeNull();
  });

  test("starts with zero pack picks remaining", () => {
    expect(usePacks.getState().packPicksRemaining).toBe(0);
  });

  test("setPackPicksRemaining accepts an updater function", () => {
    usePacks.getState().setPackPicksRemaining(3);
    usePacks.getState().setPackPicksRemaining((prev) => prev - 1);
    expect(usePacks.getState().packPicksRemaining).toBe(2);
  });

  test("setPendingForcedPacks accepts an updater function", () => {
    usePacks.getState().setPendingForcedPacks((prev) => [...prev, "arcana"]);
    expect(usePacks.getState().pendingForcedPacks).toContain("arcana");
  });

  test("resetPacks clears pending forced packs", () => {
    usePacks.getState().setPendingForcedPacks(["arcana", "spectral"]);
    usePacks.getState().resetPacks();
    expect(usePacks.getState().pendingForcedPacks).toHaveLength(0);
  });
});
