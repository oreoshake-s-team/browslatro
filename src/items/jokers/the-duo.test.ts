// @vitest-environment node
import {
  THE_DUO_X_MULT,
  applyHandLevelJokers,
  createTheDuoJoker,
} from "../jokers";

describe("applyHandLevelJokers — The Duo", () => {
  test("multiplies xMult by THE_DUO_X_MULT when played hand contains a Pair", () => {
    const result = applyHandLevelJokers([createTheDuoJoker()], {
      playedHandLabel: "Pair",
    });
    expect(result.xMult).toBe(THE_DUO_X_MULT);
  });

  test("reports The Duo as fired on a Pair", () => {
    const result = applyHandLevelJokers([createTheDuoJoker()], {
      playedHandLabel: "Pair",
    });
    expect(result.firedJokerIds).toEqual(["the-duo"]);
  });

  test("emits an xMultFactor step on a Pair", () => {
    const result = applyHandLevelJokers([createTheDuoJoker()], {
      playedHandLabel: "Pair",
    });
    expect(result.steps).toEqual([
      { jokerId: "the-duo", jokerName: "The Duo", xMultFactor: THE_DUO_X_MULT },
    ]);
  });

  test("does not multiply xMult when played hand does not contain a Pair", () => {
    const result = applyHandLevelJokers([createTheDuoJoker()], {
      playedHandLabel: "High Card",
    });
    expect(result.xMult).toBe(1);
  });

  test("does not fire when no played hand label is provided", () => {
    const result = applyHandLevelJokers([createTheDuoJoker()]);
    expect(result.firedJokerIds).toEqual([]);
  });
});
