// @vitest-environment node
import {
  THROWBACK_X_MULT_PER_SKIP,
  applyHandLevelJokers,
  createJokerCatalog,
  createThrowbackJoker,
} from "../jokers";

describe("Throwback (#868)", () => {
  test("is registered in the joker catalog", () => {
    const ids = createJokerCatalog().map((j) => j.id);
    expect(ids).toContain("throwback");
  });

  test("one skipped blind gives X1.25 Mult", () => {
    const result = applyHandLevelJokers([createThrowbackJoker()], {
      playedHandLabel: "Pair",
      blindsSkipped: 1,
    });
    expect(result.xMult).toBe(1 + THROWBACK_X_MULT_PER_SKIP);
  });

  test("four skipped blinds give X2 Mult", () => {
    const result = applyHandLevelJokers([createThrowbackJoker()], {
      playedHandLabel: "Pair",
      blindsSkipped: 4,
    });
    expect(result.xMult).toBe(1 + 4 * THROWBACK_X_MULT_PER_SKIP);
  });

  test("does not fire with zero skips (negative)", () => {
    const result = applyHandLevelJokers([createThrowbackJoker()], {
      playedHandLabel: "Pair",
      blindsSkipped: 0,
    });
    expect(result.xMult).toBe(1);
  });

  test("does not fire when blindsSkipped is not provided (negative)", () => {
    const result = applyHandLevelJokers([createThrowbackJoker()], {
      playedHandLabel: "Pair",
    });
    expect(result.xMult).toBe(1);
  });
});
