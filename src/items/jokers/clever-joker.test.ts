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

  test("adds CLEVER_JOKER_CHIPS when a Full House is played", () => {
    const result = applyHandLevelJokers([createCleverJoker()], {
      playedHandLabel: "Full House",
    });
    expect(result.additiveChips).toBe(CLEVER_JOKER_CHIPS);
  });

  test("does not fire on Four of a Kind (no two distinct pairs)", () => {
    const result = applyHandLevelJokers([createCleverJoker()], {
      playedHandLabel: "Four of a Kind",
    });
    expect(result.additiveChips).toBe(0);
  });

  test("does not fire on a single Pair", () => {
    const result = applyHandLevelJokers([createCleverJoker()], {
      playedHandLabel: "Pair",
    });
    expect(result.additiveChips).toBe(0);
  });
});
