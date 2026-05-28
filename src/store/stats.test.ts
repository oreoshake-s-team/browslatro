import { beforeEach, describe, expect, test } from "vitest";
import { useGame } from "./game";

describe("stats store", () => {
  beforeEach(() => {
    useGame.getState().resetStats();
    useGame.getState().setHandPlaySignal(0);
  });

  test("starts with a zeroed Pair play count", () => {
    expect(useGame.getState().handPlayCounts["Pair"]).toBe(0);
  });

  test("setHandPlayCounts accepts an updater function", () => {
    useGame.getState().setHandPlayCounts((prev) => ({ ...prev, Pair: prev.Pair + 1 }));
    expect(useGame.getState().handPlayCounts["Pair"]).toBe(1);
  });

  test("setHandPlaySignal accepts an updater function", () => {
    useGame.getState().setHandPlaySignal((prev) => prev + 1);
    expect(useGame.getState().handPlaySignal).toBe(1);
  });

  test("resetStats clears accumulated play counts", () => {
    useGame.getState().setHandPlayCounts((prev) => ({ ...prev, Pair: prev.Pair + 3 }));
    useGame.getState().resetStats();
    expect(useGame.getState().handPlayCounts["Pair"]).toBe(0);
  });

  test("resetStats leaves the hand-play signal untouched", () => {
    useGame.getState().setHandPlaySignal(5);
    useGame.getState().resetStats();
    expect(useGame.getState().handPlaySignal).toBe(5);
  });
});
