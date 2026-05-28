import { beforeEach, describe, expect, test } from "vitest";
import { useDevModifiers } from "./devModifiers";

describe("dev modifiers store", () => {
  beforeEach(() => {
    useDevModifiers.getState().resetDevModifiers();
  });

  test("starts with no chip bonus", () => {
    expect(useDevModifiers.getState().devChipsBonus).toBe(0);
  });

  test("starts with a neutral mult factor", () => {
    expect(useDevModifiers.getState().devMultFactor).toBe(1);
  });

  test("setDevChipsBonus accepts an updater function", () => {
    useDevModifiers.getState().setDevChipsBonus((prev) => prev + 10);
    expect(useDevModifiers.getState().devChipsBonus).toBe(10);
  });

  test("setDevMultFactor accepts an updater function", () => {
    useDevModifiers.getState().setDevMultFactor((prev) => prev * 2);
    expect(useDevModifiers.getState().devMultFactor).toBe(2);
  });

  test("setForceProbabilities accepts an updater function", () => {
    useDevModifiers.getState().setForceProbabilities((prev) => !prev);
    expect(useDevModifiers.getState().forceProbabilities).toBe(true);
  });

  test("resetDevModifiers restores the neutral mult factor", () => {
    useDevModifiers.getState().setDevMultFactor(5);
    useDevModifiers.getState().resetDevModifiers();
    expect(useDevModifiers.getState().devMultFactor).toBe(1);
  });
});
