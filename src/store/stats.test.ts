import { beforeEach, describe, expect, test } from "vitest";
import { useStats } from "./stats";

describe("stats store", () => {
  beforeEach(() => {
    useStats.getState().resetStats();
    useStats.getState().setHandPlaySignal(0);
  });

  test("starts with a zeroed Pair play count", () => {
    expect(useStats.getState().handPlayCounts["Pair"]).toBe(0);
  });

  test("setHandPlayCounts accepts an updater function", () => {
    useStats.getState().setHandPlayCounts((prev) => ({ ...prev, Pair: prev.Pair + 1 }));
    expect(useStats.getState().handPlayCounts["Pair"]).toBe(1);
  });

  test("setHandPlaySignal accepts an updater function", () => {
    useStats.getState().setHandPlaySignal((prev) => prev + 1);
    expect(useStats.getState().handPlaySignal).toBe(1);
  });

  test("resetStats clears accumulated play counts", () => {
    useStats.getState().setHandPlayCounts((prev) => ({ ...prev, Pair: prev.Pair + 3 }));
    useStats.getState().resetStats();
    expect(useStats.getState().handPlayCounts["Pair"]).toBe(0);
  });

  test("resetStats leaves the hand-play signal untouched", () => {
    useStats.getState().setHandPlaySignal(5);
    useStats.getState().resetStats();
    expect(useStats.getState().handPlaySignal).toBe(5);
  });
});
