import { beforeEach, describe, expect, test } from "vitest";
import { useBoss } from "./boss";

describe("boss store", () => {
  beforeEach(() => {
    useBoss.getState().resetBoss();
  });

  test("starts with a boss for the ante", () => {
    expect(useBoss.getState().currentBoss.id).toBeTruthy();
  });

  test("starts with no pending win", () => {
    expect(useBoss.getState().pendingWin).toBeNull();
  });

  test("starts with a neutral hand-size modifier", () => {
    expect(useBoss.getState().handSizeModifier).toBe(0);
  });

  test("setHandSizeModifier accepts an updater function", () => {
    useBoss.getState().setHandSizeModifier((prev) => prev + 1);
    expect(useBoss.getState().handSizeModifier).toBe(1);
  });

  test("setHandHistoryThisRound accepts an updater function", () => {
    useBoss.getState().setHandHistoryThisRound((prev) => [...prev, "Pair"]);
    expect(useBoss.getState().handHistoryThisRound).toContain("Pair");
  });

  test("resetBoss clears the played-card-keys set", () => {
    useBoss.getState().setPlayedCardKeysThisAnte(new Set(["AS"]));
    useBoss.getState().resetBoss();
    expect(useBoss.getState().playedCardKeysThisAnte.size).toBe(0);
  });
});
