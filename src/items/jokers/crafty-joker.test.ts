// @vitest-environment node
import {
  CRAFTY_JOKER_CHIPS,
  applyHandLevelJokers,
  createCraftyJoker,
} from "../jokers";

describe("applyHandLevelJokers — Crafty Joker", () => {
  test("adds CRAFTY_JOKER_CHIPS when played hand contains a Flush", () => {
    const result = applyHandLevelJokers([createCraftyJoker()], {
      playedHandLabel: "Flush",
    });
    expect(result.additiveChips).toBe(CRAFTY_JOKER_CHIPS);
  });

  test("does not fire on a Straight (Straight does not contain Flush)", () => {
    const result = applyHandLevelJokers([createCraftyJoker()], {
      playedHandLabel: "Straight",
    });
    expect(result.additiveChips).toBe(0);
  });
});
