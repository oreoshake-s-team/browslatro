// @vitest-environment node
import {
  THE_ORDER_X_MULT,
  applyHandLevelJokers,
  createTheOrderJoker,
} from "../jokers";

describe("applyHandLevelJokers — The Order", () => {
  test("multiplies xMult by THE_ORDER_X_MULT when played hand contains a Straight", () => {
    const result = applyHandLevelJokers([createTheOrderJoker()], {
      playedHandLabel: "Straight",
    });
    expect(result.xMult).toBe(THE_ORDER_X_MULT);
  });

  test("fires on a Straight Flush because it contains a Straight", () => {
    const result = applyHandLevelJokers([createTheOrderJoker()], {
      playedHandLabel: "Straight Flush",
    });
    expect(result.firedJokerIds).toEqual(["the-order"]);
  });

  test("does not multiply xMult when played hand contains only a Flush", () => {
    const result = applyHandLevelJokers([createTheOrderJoker()], {
      playedHandLabel: "Flush",
    });
    expect(result.xMult).toBe(1);
  });

  test("does not fire when no played hand label is provided", () => {
    const result = applyHandLevelJokers([createTheOrderJoker()]);
    expect(result.firedJokerIds).toEqual([]);
  });
});
