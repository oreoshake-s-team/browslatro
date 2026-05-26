// @vitest-environment node
import {
  MISPRINT_MAX_MULT,
  MISPRINT_MIN_MULT,
  applyHandLevelJokers,
  createMisprintJoker,
} from "../jokers";

describe("Misprint joker", () => {
  test("with rng() → 0 returns the minimum (MISPRINT_MIN_MULT)", () => {
    const result = applyHandLevelJokers([createMisprintJoker()], {
      rng: () => 0,
    });
    expect(result.additiveMult).toBe(MISPRINT_MIN_MULT);
  });

  test("with rng() just under 1 returns the maximum (MISPRINT_MAX_MULT)", () => {
    const result = applyHandLevelJokers([createMisprintJoker()], {
      rng: () => 0.9999999,
    });
    expect(result.additiveMult).toBe(MISPRINT_MAX_MULT);
  });

  test("over many draws all integers in [min..max] are reachable", () => {
    const seen = new Set<number>();
    const span = MISPRINT_MAX_MULT - MISPRINT_MIN_MULT + 1;
    for (let i = 0; i < span; i += 1) {
      const rng = (): number => i / span + 0.001;
      const result = applyHandLevelJokers([createMisprintJoker()], { rng });
      seen.add(result.additiveMult);
    }
    expect(seen.size).toBe(span);
  });

  test("always fires (records itself in firedJokerIds)", () => {
    const result = applyHandLevelJokers([createMisprintJoker()], {
      rng: () => 0,
    });
    expect(result.firedJokerIds).toContain("misprint");
  });
});
