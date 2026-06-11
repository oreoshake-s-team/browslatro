// @vitest-environment node
import {
  TO_DO_LIST_PAYOUT,
  applyHandLevelJokers,
  createJokerCatalog,
  createToDoListJoker,
} from "../jokers";

describe("To Do List", () => {
  test("is registered in the joker catalog", () => {
    const ids = createJokerCatalog().map((j) => j.id);
    expect(ids).toContain("to-do-list");
  });

  test("pays $4 when the listed hand is played", () => {
    const result = applyHandLevelJokers([createToDoListJoker()], {
      playedHandLabel: "Pair",
      todoHand: "Pair",
    });
    expect(result.moneyEarned).toBe(TO_DO_LIST_PAYOUT);
  });

  test("pays nothing for a different hand (negative)", () => {
    const result = applyHandLevelJokers([createToDoListJoker()], {
      playedHandLabel: "Flush",
      todoHand: "Pair",
    });
    expect(result.moneyEarned).toBe(0);
  });

  test("pays nothing without a listed hand (negative)", () => {
    const result = applyHandLevelJokers([createToDoListJoker()], {
      playedHandLabel: "Pair",
      todoHand: null,
    });
    expect(result.moneyEarned).toBe(0);
  });
});
