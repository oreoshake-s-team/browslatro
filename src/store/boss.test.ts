import { beforeEach, describe, expect, test } from "vitest";
import { useGame } from "./game";

describe("boss store", () => {
  beforeEach(() => {
    useGame.getState().resetBoss();
  });

  test("starts with a boss for the ante", () => {
    expect(useGame.getState().currentBoss.id).toBeTruthy();
  });

  test("starts with no pending win", () => {
    expect(useGame.getState().pendingWin).toBeNull();
  });

  test("starts with a neutral hand-size modifier", () => {
    expect(useGame.getState().handSizeModifier).toBe(0);
  });

  test("setHandSizeModifier accepts an updater function", () => {
    useGame.getState().setHandSizeModifier((prev) => prev + 1);
    expect(useGame.getState().handSizeModifier).toBe(1);
  });

  test("setHandHistoryThisRound accepts an updater function", () => {
    useGame.getState().setHandHistoryThisRound((prev) => [...prev, "Pair"]);
    expect(useGame.getState().handHistoryThisRound).toContain("Pair");
  });

  test("resetBoss clears the played-card-keys set", () => {
    useGame.getState().setPlayedCardKeysThisAnte(new Set(["AS"]));
    useGame.getState().resetBoss();
    expect(useGame.getState().playedCardKeysThisAnte.size).toBe(0);
  });
});
