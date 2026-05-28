// @vitest-environment node
import {
  THE_TRIO_X_MULT,
  applyHandLevelJokers,
  createTheTrioJoker,
} from "../jokers";

describe("applyHandLevelJokers — The Trio", () => {
  test("multiplies xMult by THE_TRIO_X_MULT when played hand contains Three of a Kind", () => {
    const result = applyHandLevelJokers([createTheTrioJoker()], {
      playedHandLabel: "Three of a Kind",
    });
    expect(result.xMult).toBe(THE_TRIO_X_MULT);
  });

  test("fires on a Full House because it contains Three of a Kind", () => {
    const result = applyHandLevelJokers([createTheTrioJoker()], {
      playedHandLabel: "Full House",
    });
    expect(result.firedJokerIds).toEqual(["the-trio"]);
  });

  test("does not multiply xMult when played hand contains only a Pair", () => {
    const result = applyHandLevelJokers([createTheTrioJoker()], {
      playedHandLabel: "Pair",
    });
    expect(result.xMult).toBe(1);
  });

  test("does not fire when no played hand label is provided", () => {
    const result = applyHandLevelJokers([createTheTrioJoker()]);
    expect(result.firedJokerIds).toEqual([]);
  });
});
