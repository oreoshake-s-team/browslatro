// @vitest-environment node
import { HANDS } from "../constants";
import type { HandLabel } from "./handEvaluator";
import { createDefaultHandStats } from "./handStats";

describe("createDefaultHandStats", () => {
  test("returns an entry for every HANDS label", () => {
    const stats = createDefaultHandStats();
    for (const hand of HANDS) {
      expect(stats[hand.label as HandLabel]).toBeDefined();
    }
  });

  test("mirrors HANDS chips for each label", () => {
    const stats = createDefaultHandStats();
    for (const hand of HANDS) {
      expect(stats[hand.label as HandLabel].chips).toBe(hand.chips);
    }
  });

  test("mirrors HANDS multiplier for each label", () => {
    const stats = createDefaultHandStats();
    for (const hand of HANDS) {
      expect(stats[hand.label as HandLabel].multiplier).toBe(hand.multiplier);
    }
  });

  test("initializes every hand to level 1", () => {
    const stats = createDefaultHandStats();
    for (const hand of HANDS) {
      expect(stats[hand.label as HandLabel].level).toBe(1);
    }
  });

  test("produces independent copies between calls (mutation safety)", () => {
    const a = createDefaultHandStats();
    const b = createDefaultHandStats();
    expect(a).not.toBe(b);
  });
});
