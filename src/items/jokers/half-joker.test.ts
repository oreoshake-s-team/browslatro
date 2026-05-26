// @vitest-environment node
import {
  HALF_JOKER_MAX_CARDS,
  HALF_JOKER_MULT,
  applyHandLevelJokers,
  createHalfJoker,
} from "../jokers";

describe("Half Joker", () => {
  test("adds HALF_JOKER_MULT when the played hand has exactly HALF_JOKER_MAX_CARDS cards", () => {
    const result = applyHandLevelJokers([createHalfJoker()], {
      playedCardCount: HALF_JOKER_MAX_CARDS,
    });
    expect(result.additiveMult).toBe(HALF_JOKER_MULT);
  });

  test("adds HALF_JOKER_MULT when the played hand has a single card", () => {
    const result = applyHandLevelJokers([createHalfJoker()], {
      playedCardCount: 1,
    });
    expect(result.additiveMult).toBe(HALF_JOKER_MULT);
  });

  test("does not proc when the played hand has more than HALF_JOKER_MAX_CARDS cards", () => {
    const result = applyHandLevelJokers([createHalfJoker()], {
      playedCardCount: HALF_JOKER_MAX_CARDS + 1,
    });
    expect(result.additiveMult).toBe(0);
  });

  test("does not proc when playedCardCount is missing from context", () => {
    const result = applyHandLevelJokers([createHalfJoker()], {});
    expect(result.additiveMult).toBe(0);
  });
});
