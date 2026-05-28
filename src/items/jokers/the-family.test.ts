// @vitest-environment node
import {
  THE_FAMILY_X_MULT,
  applyHandLevelJokers,
  createTheFamilyJoker,
} from "../jokers";

describe("applyHandLevelJokers — The Family", () => {
  test("multiplies xMult by THE_FAMILY_X_MULT when played hand contains Four of a Kind", () => {
    const result = applyHandLevelJokers([createTheFamilyJoker()], {
      playedHandLabel: "Four of a Kind",
    });
    expect(result.xMult).toBe(THE_FAMILY_X_MULT);
  });

  test("reports The Family as fired on Four of a Kind", () => {
    const result = applyHandLevelJokers([createTheFamilyJoker()], {
      playedHandLabel: "Four of a Kind",
    });
    expect(result.firedJokerIds).toEqual(["the-family"]);
  });

  test("does not multiply xMult when played hand contains only Three of a Kind", () => {
    const result = applyHandLevelJokers([createTheFamilyJoker()], {
      playedHandLabel: "Three of a Kind",
    });
    expect(result.xMult).toBe(1);
  });

  test("does not fire when no played hand label is provided", () => {
    const result = applyHandLevelJokers([createTheFamilyJoker()]);
    expect(result.firedJokerIds).toEqual([]);
  });
});
