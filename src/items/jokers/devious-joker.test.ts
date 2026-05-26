// @vitest-environment node
import {
  DEVIOUS_JOKER_CHIPS,
  applyHandLevelJokers,
  createDeviousJoker,
} from "../jokers";

describe("applyHandLevelJokers — Devious Joker", () => {
  test("adds DEVIOUS_JOKER_CHIPS when played hand contains a Straight", () => {
    const result = applyHandLevelJokers([createDeviousJoker()], {
      playedHandLabel: "Straight",
    });
    expect(result.additiveChips).toBe(DEVIOUS_JOKER_CHIPS);
  });

  test("does not fire on a Flush (Flush does not contain Straight)", () => {
    const result = applyHandLevelJokers([createDeviousJoker()], {
      playedHandLabel: "Flush",
    });
    expect(result.additiveChips).toBe(0);
  });
});
