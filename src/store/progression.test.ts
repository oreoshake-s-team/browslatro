import { beforeEach, describe, expect, test } from "vitest";
import { useProgression } from "./progression";

describe("progression store", () => {
  beforeEach(() => {
    useProgression.getState().resetProgression();
  });

  test("starts at blind 1", () => {
    expect(useProgression.getState().blind).toBe(1);
  });

  test("starts with the blind-select screen pending", () => {
    expect(useProgression.getState().pendingBlindSelect).toBe(true);
  });

  test("setRound accepts an updater function", () => {
    useProgression.getState().setRound((prev) => prev + 1);
    expect(useProgression.getState().round).toBe(2);
  });

  test("setPendingTags accepts an updater function", () => {
    useProgression.getState().setPendingTags((prev) => [...prev, "investment"]);
    expect(useProgression.getState().pendingTags).toContain("investment");
  });

  test("setPendingBlindSelect accepts a plain value", () => {
    useProgression.getState().setPendingBlindSelect(false);
    expect(useProgression.getState().pendingBlindSelect).toBe(false);
  });

  test("resetProgression restores the starting ante", () => {
    useProgression.getState().setAnte(5);
    useProgression.getState().resetProgression();
    expect(useProgression.getState().ante).toBe(1);
  });
});
