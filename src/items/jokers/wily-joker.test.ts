// @vitest-environment node
import {
  WILY_JOKER_CHIPS,
  applyHandLevelJokers,
  createWilyJoker,
} from "../jokers";

describe("applyHandLevelJokers — Wily Joker", () => {
  test("adds WILY_JOKER_CHIPS when played hand contains Three of a Kind", () => {
    const result = applyHandLevelJokers([createWilyJoker()], {
      playedHandLabel: "Three of a Kind",
    });
    expect(result.additiveChips).toBe(WILY_JOKER_CHIPS);
  });

  test("does not fire on a Pair (does not contain Three of a Kind)", () => {
    const result = applyHandLevelJokers([createWilyJoker()], {
      playedHandLabel: "Pair",
    });
    expect(result.additiveChips).toBe(0);
  });
});
