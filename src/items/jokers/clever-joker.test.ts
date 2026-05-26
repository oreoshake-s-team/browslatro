// @vitest-environment node
import {
  CLEVER_JOKER_CHIPS,
  applyHandLevelJokers,
  createCleverJoker,
} from "../jokers";

describe("applyHandLevelJokers — Clever Joker", () => {
  test("adds CLEVER_JOKER_CHIPS when played hand contains Two Pair", () => {
    const result = applyHandLevelJokers([createCleverJoker()], {
      playedHandLabel: "Two Pair",
    });
    expect(result.additiveChips).toBe(CLEVER_JOKER_CHIPS);
  });

  test("does not fire on a single Pair", () => {
    const result = applyHandLevelJokers([createCleverJoker()], {
      playedHandLabel: "Pair",
    });
    expect(result.additiveChips).toBe(0);
  });
});
