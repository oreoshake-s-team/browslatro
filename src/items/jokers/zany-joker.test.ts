// @vitest-environment node
import {
  ZANY_JOKER_MULT,
  applyHandLevelJokers,
  createZanyJoker,
} from "../jokers";

describe("applyHandLevelJokers — Zany Joker", () => {
  test("adds ZANY_JOKER_MULT when played hand contains Three of a Kind", () => {
    const result = applyHandLevelJokers([createZanyJoker()], {
      playedHandLabel: "Three of a Kind",
    });
    expect(result.additiveMult).toBe(ZANY_JOKER_MULT);
  });

  test("does not fire on a Pair (does not contain Three of a Kind)", () => {
    const result = applyHandLevelJokers([createZanyJoker()], {
      playedHandLabel: "Pair",
    });
    expect(result.firedJokerIds).toEqual([]);
  });
});
