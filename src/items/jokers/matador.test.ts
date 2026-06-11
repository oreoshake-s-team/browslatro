// @vitest-environment node
import {
  MATADOR_PAYOUT,
  applyHandLevelJokers,
  createJokerCatalog,
  createMatadorJoker,
} from "../jokers";

describe("Matador", () => {
  test("is registered in the joker catalog", () => {
    const ids = createJokerCatalog().map((j) => j.id);
    expect(ids).toContain("matador");
  });

  test("pays $8 when the boss ability triggers", () => {
    const result = applyHandLevelJokers([createMatadorJoker()], {
      playedHandLabel: "Pair",
      bossTriggered: true,
    });
    expect(result.moneyEarned).toBe(MATADOR_PAYOUT);
  });

  test("pays nothing when the boss does not trigger (negative)", () => {
    const result = applyHandLevelJokers([createMatadorJoker()], {
      playedHandLabel: "Pair",
      bossTriggered: false,
    });
    expect(result.moneyEarned).toBe(0);
  });

  test("pays nothing outside a boss round (negative)", () => {
    const result = applyHandLevelJokers([createMatadorJoker()], {
      playedHandLabel: "Pair",
    });
    expect(result.moneyEarned).toBe(0);
  });
});
