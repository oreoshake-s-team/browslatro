import { beforeEach, describe, expect, test } from "vitest";
import { useJokers } from "./jokers";

describe("jokers store", () => {
  beforeEach(() => {
    useJokers.getState().resetJokers();
  });

  test("starts with no jokers", () => {
    expect(useJokers.getState().jokers).toHaveLength(0);
  });

  test("starts with no dragging index", () => {
    expect(useJokers.getState().draggingJokerIndex).toBeNull();
  });

  test("setSoldJokerIdsThisShopVisit accepts an updater function", () => {
    useJokers.getState().setSoldJokerIdsThisShopVisit((prev) => [...prev, "j1"]);
    expect(useJokers.getState().soldJokerIdsThisShopVisit).toContain("j1");
  });

  test("setJokerPulseCounters accepts an updater function", () => {
    useJokers.getState().setJokerPulseCounters((prev) => ({ ...prev, j1: 1 }));
    expect(useJokers.getState().jokerPulseCounters["j1"]).toBe(1);
  });

  test("resetJokers clears sold joker ids", () => {
    useJokers.getState().setSoldJokerIdsThisShopVisit(["j1"]);
    useJokers.getState().resetJokers();
    expect(useJokers.getState().soldJokerIdsThisShopVisit).toHaveLength(0);
  });
});
