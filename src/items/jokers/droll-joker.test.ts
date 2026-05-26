// @vitest-environment node
import {
  DROLL_JOKER_MULT,
  applyHandLevelJokers,
  createDrollJoker,
} from "../jokers";

describe("applyHandLevelJokers — Droll Joker", () => {
  test("adds DROLL_JOKER_MULT when played hand contains a Flush", () => {
    const result = applyHandLevelJokers([createDrollJoker()], {
      playedHandLabel: "Flush",
    });
    expect(result.additiveMult).toBe(DROLL_JOKER_MULT);
  });

  test("does not fire on a Straight (Straight does not contain Flush)", () => {
    const result = applyHandLevelJokers([createDrollJoker()], {
      playedHandLabel: "Straight",
    });
    expect(result.firedJokerIds).toEqual([]);
  });
});
