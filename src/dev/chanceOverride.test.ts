// @vitest-environment node
import { afterEach } from "vitest";
import { chanceOverrideConfig, rollChance } from "./chanceOverride";

afterEach(() => {
  chanceOverrideConfig.force100 = false;
  chanceOverrideConfig.probabilityMultiplier = 1;
});

describe("rollChance", () => {
  test("returns false for chance 0 regardless of rng or override", () => {
    expect(rollChance(0, () => 0)).toBe(false);
  });

  test("returns true for chance 1 regardless of rng", () => {
    expect(rollChance(1, () => 0.99)).toBe(true);
  });

  test("returns true when rng undershoots the threshold", () => {
    expect(rollChance(0.25, () => 0.1)).toBe(true);
  });

  test("returns false when rng meets the threshold", () => {
    expect(rollChance(0.25, () => 0.25)).toBe(false);
  });

  test("returns false when rng exceeds the threshold", () => {
    expect(rollChance(0.5, () => 0.7)).toBe(false);
  });
});

describe("rollChance with force100 override", () => {
  test("returns true for an in-range chance even when rng would miss", () => {
    chanceOverrideConfig.force100 = true;
    expect(rollChance(0.05, () => 0.99)).toBe(true);
  });

  test("still returns false for chance 0 (negative case — a 0-chance effect must never fire)", () => {
    chanceOverrideConfig.force100 = true;
    expect(rollChance(0, () => 0)).toBe(false);
  });

  test("still returns false for chance below 0", () => {
    chanceOverrideConfig.force100 = true;
    expect(rollChance(-0.5, () => 0)).toBe(false);
  });

  test("does not consume the rng when forcing a hit", () => {
    chanceOverrideConfig.force100 = true;
    const rng = vi.fn(() => 0.99);
    rollChance(0.1, rng);
    expect(rng).not.toHaveBeenCalled();
  });
});

describe("chanceOverrideConfig defaults", () => {
  test("force100 starts false (no global side effects across imports)", () => {
    expect(chanceOverrideConfig.force100).toBe(false);
  });

  test("probabilityMultiplier starts at 1 (identity — no doubling)", () => {
    expect(chanceOverrideConfig.probabilityMultiplier).toBe(1);
  });
});

describe("rollChance with probabilityMultiplier", () => {
  test("doubles the effective chance so an rng at 0.5 trips a 0.3 base chance", () => {
    chanceOverrideConfig.probabilityMultiplier = 2;
    expect(rollChance(0.3, () => 0.5)).toBe(true);
  });

  test("still misses when rng exceeds the doubled chance (0.3 * 2 = 0.6, rng 0.7)", () => {
    chanceOverrideConfig.probabilityMultiplier = 2;
    expect(rollChance(0.3, () => 0.7)).toBe(false);
  });

  test("clamps the effective chance at 1.0 (0.8 * 2 = 1.6 → guaranteed)", () => {
    chanceOverrideConfig.probabilityMultiplier = 2;
    expect(rollChance(0.8, () => 0.99)).toBe(true);
  });

  test("does not consume the rng once the doubled chance clamps to 1", () => {
    chanceOverrideConfig.probabilityMultiplier = 2;
    const rng = vi.fn(() => 0.99);
    rollChance(0.8, rng);
    expect(rng).not.toHaveBeenCalled();
  });

  test("falls back to identity when set to 0 (defensive against bad inputs)", () => {
    chanceOverrideConfig.probabilityMultiplier = 0;
    expect(rollChance(0.5, () => 0.4)).toBe(true);
  });

  test("still returns false for chance 0 even when multiplied", () => {
    chanceOverrideConfig.probabilityMultiplier = 10;
    expect(rollChance(0, () => 0)).toBe(false);
  });
});
