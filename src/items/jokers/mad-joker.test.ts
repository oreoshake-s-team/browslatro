// @vitest-environment node
import {
  MAD_JOKER_MULT,
  applyHandLevelJokers,
  createMadJoker,
} from "../jokers";

describe("applyHandLevelJokers — Mad Joker", () => {
  test("adds MAD_JOKER_MULT when played hand contains Two Pair", () => {
    const result = applyHandLevelJokers([createMadJoker()], {
      playedHandLabel: "Two Pair",
    });
    expect(result.additiveMult).toBe(MAD_JOKER_MULT);
  });

  test("does not fire on a single Pair", () => {
    const result = applyHandLevelJokers([createMadJoker()], {
      playedHandLabel: "Pair",
    });
    expect(result.firedJokerIds).toEqual([]);
  });
});
