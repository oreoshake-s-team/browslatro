import { beforeEach, describe, expect, test } from "vitest";
import { useRun } from "./run";

describe("run store", () => {
  beforeEach(() => {
    useRun.getState().resetRun();
  });

  test("starts with zero hands played", () => {
    expect(useRun.getState().runStats.handsPlayed).toBe(0);
  });

  test("starts with no pending shop mods", () => {
    expect(useRun.getState().pendingShopMods).toHaveLength(0);
  });

  test("seeds skip tag offers", () => {
    expect(useRun.getState().skipTagOffers.small).toBeTruthy();
  });

  test("setRunStats accepts an updater function", () => {
    useRun.getState().setRunStats((prev) => ({ ...prev, handsPlayed: prev.handsPlayed + 1 }));
    expect(useRun.getState().runStats.handsPlayed).toBe(1);
  });

  test("setPendingShopMods accepts an updater function", () => {
    useRun.getState().setPendingShopMods((prev) => [...prev]);
    expect(useRun.getState().pendingShopMods).toHaveLength(0);
  });

  test("resetRun clears accumulated run stats", () => {
    useRun.getState().setRunStats((prev) => ({ ...prev, handsPlayed: 5 }));
    useRun.getState().resetRun();
    expect(useRun.getState().runStats.handsPlayed).toBe(0);
  });
});
