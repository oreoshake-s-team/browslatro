// @vitest-environment node
import {
  CRAZY_JOKER_MULT,
  applyHandLevelJokers,
  createCrazyJoker,
} from "../jokers";

describe("applyHandLevelJokers — Crazy Joker", () => {
  test("adds CRAZY_JOKER_MULT when played hand contains a Straight", () => {
    const result = applyHandLevelJokers([createCrazyJoker()], {
      playedHandLabel: "Straight",
    });
    expect(result.additiveMult).toBe(CRAZY_JOKER_MULT);
  });

  test("does not fire on a Flush (Flush does not contain Straight)", () => {
    const result = applyHandLevelJokers([createCrazyJoker()], {
      playedHandLabel: "Flush",
    });
    expect(result.firedJokerIds).toEqual([]);
  });
});
