import { beforeEach, describe, expect, test } from "vitest";
import { useGame } from "./game";

describe("dev modifiers store", () => {
  beforeEach(() => {
    useGame.getState().resetDevModifiers();
  });

  test("starts with no chip bonus", () => {
    expect(useGame.getState().devChipsBonus).toBe(0);
  });

  test("starts with a neutral mult factor", () => {
    expect(useGame.getState().devMultFactor).toBe(1);
  });

  test("setDevChipsBonus accepts an updater function", () => {
    useGame.getState().setDevChipsBonus((prev) => prev + 10);
    expect(useGame.getState().devChipsBonus).toBe(10);
  });

  test("setDevMultFactor accepts an updater function", () => {
    useGame.getState().setDevMultFactor((prev) => prev * 2);
    expect(useGame.getState().devMultFactor).toBe(2);
  });

  test("setForceProbabilities accepts an updater function", () => {
    useGame.getState().setForceProbabilities((prev) => !prev);
    expect(useGame.getState().forceProbabilities).toBe(true);
  });

  test("resetDevModifiers restores the neutral mult factor", () => {
    useGame.getState().setDevMultFactor(5);
    useGame.getState().resetDevModifiers();
    expect(useGame.getState().devMultFactor).toBe(1);
  });
});
