// @vitest-environment node
import {
  THE_TRIBE_X_MULT,
  applyHandLevelJokers,
  createTheTribeJoker,
} from "../jokers";

describe("applyHandLevelJokers — The Tribe", () => {
  test("multiplies xMult by THE_TRIBE_X_MULT when played hand contains a Flush", () => {
    const result = applyHandLevelJokers([createTheTribeJoker()], {
      playedHandLabel: "Flush",
    });
    expect(result.xMult).toBe(THE_TRIBE_X_MULT);
  });

  test("fires on a Straight Flush because it contains a Flush", () => {
    const result = applyHandLevelJokers([createTheTribeJoker()], {
      playedHandLabel: "Straight Flush",
    });
    expect(result.firedJokerIds).toEqual(["the-tribe"]);
  });

  test("does not multiply xMult when played hand contains only a Straight", () => {
    const result = applyHandLevelJokers([createTheTribeJoker()], {
      playedHandLabel: "Straight",
    });
    expect(result.xMult).toBe(1);
  });

  test("does not fire when no played hand label is provided", () => {
    const result = applyHandLevelJokers([createTheTribeJoker()]);
    expect(result.firedJokerIds).toEqual([]);
  });
});
