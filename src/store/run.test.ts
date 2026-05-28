import { beforeEach, describe, expect, test } from "vitest";
import { useGame } from "./game";

describe("run store", () => {
  beforeEach(() => {
    useGame.getState().resetRun();
  });

  test("starts with zero hands played", () => {
    expect(useGame.getState().runStats.handsPlayed).toBe(0);
  });

  test("starts with no pending shop mods", () => {
    expect(useGame.getState().pendingShopMods).toHaveLength(0);
  });

  test("seeds skip tag offers", () => {
    expect(useGame.getState().skipTagOffers.small).toBeTruthy();
  });

  test("setRunStats accepts an updater function", () => {
    useGame.getState().setRunStats((prev) => ({ ...prev, handsPlayed: prev.handsPlayed + 1 }));
    expect(useGame.getState().runStats.handsPlayed).toBe(1);
  });

  test("setPendingShopMods accepts an updater function", () => {
    useGame.getState().setPendingShopMods((prev) => [...prev]);
    expect(useGame.getState().pendingShopMods).toHaveLength(0);
  });

  test("resetRun clears accumulated run stats", () => {
    useGame.getState().setRunStats((prev) => ({ ...prev, handsPlayed: 5 }));
    useGame.getState().resetRun();
    expect(useGame.getState().runStats.handsPlayed).toBe(0);
  });
});
