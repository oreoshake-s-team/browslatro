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

  test("starts with zero pending next-round hand size", () => {
    expect(useGame.getState().pendingNextRoundHandSize).toBe(0);
  });

  test("starts with pendingDouble false", () => {
    expect(useGame.getState().pendingDouble).toBe(false);
  });

  test("setPendingNextRoundHandSize accepts an updater function", () => {
    useGame.getState().setPendingNextRoundHandSize((prev) => prev + 2);
    expect(useGame.getState().pendingNextRoundHandSize).toBe(2);
  });

  test("setPendingDouble accepts a boolean", () => {
    useGame.getState().setPendingDouble(true);
    expect(useGame.getState().pendingDouble).toBe(true);
  });

  test("resetRun clears pending next-round hand size", () => {
    useGame.getState().setPendingNextRoundHandSize(3);
    useGame.getState().resetRun();
    expect(useGame.getState().pendingNextRoundHandSize).toBe(0);
  });

  test("resetRun clears pendingDouble", () => {
    useGame.getState().setPendingDouble(true);
    useGame.getState().resetRun();
    expect(useGame.getState().pendingDouble).toBe(false);
  });

  test("starts at the White stake by default", () => {
    expect(useGame.getState().selectedStake).toBe("white");
  });

  test("setSelectedStake updates the stored stake", () => {
    useGame.getState().setSelectedStake("gold");
    expect(useGame.getState().selectedStake).toBe("gold");
  });

  test("resetRun returns the stake to White", () => {
    useGame.getState().setSelectedStake("orange");
    useGame.getState().resetRun();
    expect(useGame.getState().selectedStake).toBe("white");
  });

  test("starts on the Red Deck by default", () => {
    expect(useGame.getState().selectedDeck).toBe("red-deck");
  });

  test("setSelectedDeck updates the stored deck", () => {
    useGame.getState().setSelectedDeck("yellow-deck");
    expect(useGame.getState().selectedDeck).toBe("yellow-deck");
  });

  test("resetRun returns the deck to the default Red Deck", () => {
    useGame.getState().setSelectedDeck("yellow-deck");
    useGame.getState().resetRun();
    expect(useGame.getState().selectedDeck).toBe("red-deck");
  });
});
