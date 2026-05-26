// @vitest-environment node
import { afterEach } from "vitest";
import { chanceOverrideConfig, rollChance } from "./chanceOverride";

afterEach(() => {
  chanceOverrideConfig.force100 = false;
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
});
