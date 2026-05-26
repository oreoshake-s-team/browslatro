// @vitest-environment node
import {
  SLY_JOKER_CHIPS,
  applyHandLevelJokers,
  createSlyJoker,
} from "../jokers";

describe("applyHandLevelJokers — Sly Joker", () => {
  test("adds SLY_JOKER_CHIPS when played hand contains a Pair", () => {
    const result = applyHandLevelJokers([createSlyJoker()], {
      playedHandLabel: "Pair",
    });
    expect(result.additiveChips).toBe(SLY_JOKER_CHIPS);
  });

  test("does not add chips when played hand does not contain a Pair", () => {
    const result = applyHandLevelJokers([createSlyJoker()], {
      playedHandLabel: "High Card",
    });
    expect(result.additiveChips).toBe(0);
  });
});
