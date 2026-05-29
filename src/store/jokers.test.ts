import { beforeEach, describe, expect, test } from "vitest";
import { useGame } from "./game";

describe("jokers store", () => {
  beforeEach(() => {
    useGame.getState().resetJokers();
  });

  test("starts with no jokers", () => {
    expect(useGame.getState().jokers).toHaveLength(0);
  });

  test("starts with no dragging index", () => {
    expect(useGame.getState().draggingJokerIndex).toBeNull();
  });

  test("setSoldJokerIdsThisShopVisit accepts an updater function", () => {
    useGame.getState().setSoldJokerIdsThisShopVisit((prev) => [...prev, "j1"]);
    expect(useGame.getState().soldJokerIdsThisShopVisit).toContain("j1");
  });

  test("setJokerPulseCounters accepts an updater function", () => {
    useGame.getState().setJokerPulseCounters((prev) => ({ ...prev, j1: 1 }));
    expect(useGame.getState().jokerPulseCounters["j1"]).toBe(1);
  });

  test("resetJokers clears sold joker ids", () => {
    useGame.getState().setSoldJokerIdsThisShopVisit(["j1"]);
    useGame.getState().resetJokers();
    expect(useGame.getState().soldJokerIdsThisShopVisit).toHaveLength(0);
  });
});
