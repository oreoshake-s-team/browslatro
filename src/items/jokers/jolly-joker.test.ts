// @vitest-environment node
import {
  JOLLY_JOKER_MULT,
  applyHandLevelJokers,
  createJollyJoker,
} from "../jokers";

describe("applyHandLevelJokers — Jolly Joker", () => {
  test("adds JOLLY_JOKER_MULT when played hand contains a Pair", () => {
    const result = applyHandLevelJokers([createJollyJoker()], {
      playedHandLabel: "Pair",
    });
    expect(result.additiveMult).toBe(JOLLY_JOKER_MULT);
  });

  test("reports Jolly Joker as fired on a Pair", () => {
    const result = applyHandLevelJokers([createJollyJoker()], {
      playedHandLabel: "Pair",
    });
    expect(result.firedJokerIds).toEqual(["jolly-joker"]);
  });

  test("does not add mult when played hand does not contain a Pair", () => {
    const result = applyHandLevelJokers([createJollyJoker()], {
      playedHandLabel: "High Card",
    });
    expect(result.additiveMult).toBe(0);
  });

  test("does not fire when no played hand label is provided", () => {
    const result = applyHandLevelJokers([createJollyJoker()]);
    expect(result.firedJokerIds).toEqual([]);
  });
});
