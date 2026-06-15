// @vitest-environment node
import {
  advanceStackGainsForScoring,
  applyHandLevelJokers,
  applyHandPlayedToJokerStates,
  createJokerCatalog,
  createLoyaltyCardJoker,
  LOYALTY_CARD_HANDS_PER_TRIGGER,
  LOYALTY_CARD_X_MULT,
} from "../jokers";

const HC_CTX = {
  playedHandLabel: "High Card" as const,
  playedCardCount: 1,
  scoredCards: [],
};

function playN(n: number) {
  let jokers = [createLoyaltyCardJoker()];
  for (let i = 0; i < n; i += 1) {
    jokers = applyHandPlayedToJokerStates(jokers, HC_CTX);
  }
  return jokers;
}

describe("Loyalty Card joker", () => {
  test("is registered in the joker catalog", () => {
    const ids = createJokerCatalog().map((j) => j.id);
    expect(ids).toContain("loyalty-card");
  });

  test("starts with state.value 0", () => {
    expect(createLoyaltyCardJoker().state).toEqual({ kind: "counter", value: 0 });
  });

  test("does not fire on equip (counter 0, score=1)", () => {
    const result = applyHandLevelJokers([createLoyaltyCardJoker()], {
      playedHandLabel: "High Card",
    });
    expect(result.xMult).toBe(1);
  });

  test("the counter increments by 1 after each hand played", () => {
    const jokers = playN(1);
    expect(jokers[0].state).toEqual({ kind: "counter", value: 1 });
  });

  test("does not fire on hand 1 (counter=1)", () => {
    const jokers = playN(1);
    const result = applyHandLevelJokers(jokers, { playedHandLabel: "High Card" });
    expect(result.xMult).toBe(1);
  });

  test("does not fire on hand 5 (counter=5)", () => {
    const jokers = playN(5);
    const result = applyHandLevelJokers(jokers, { playedHandLabel: "High Card" });
    expect(result.xMult).toBe(1);
  });

  test("fires ×4 Mult on hand 6 (counter=6)", () => {
    const jokers = playN(LOYALTY_CARD_HANDS_PER_TRIGGER);
    const result = applyHandLevelJokers(jokers, { playedHandLabel: "High Card" });
    expect(result.xMult).toBe(LOYALTY_CARD_X_MULT);
  });

  test("does not fire on hand 7 (counter=7)", () => {
    const jokers = playN(7);
    const result = applyHandLevelJokers(jokers, { playedHandLabel: "High Card" });
    expect(result.xMult).toBe(1);
  });

  test("fires again on hand 12 (counter=12, next cycle)", () => {
    const jokers = playN(LOYALTY_CARD_HANDS_PER_TRIGGER * 2);
    const result = applyHandLevelJokers(jokers, { playedHandLabel: "High Card" });
    expect(result.xMult).toBe(LOYALTY_CARD_X_MULT);
  });

  test("fires again on hand 18 (counter=18, third cycle)", () => {
    const jokers = playN(LOYALTY_CARD_HANDS_PER_TRIGGER * 3);
    const result = applyHandLevelJokers(jokers, { playedHandLabel: "High Card" });
    expect(result.xMult).toBe(LOYALTY_CARD_X_MULT);
  });

  test("fires X4 on the 6th played hand through the real pipeline order", () => {
    const beforeSixth = playN(LOYALTY_CARD_HANDS_PER_TRIGGER - 1);
    const scoringJokers = advanceStackGainsForScoring(beforeSixth, HC_CTX);
    const result = applyHandLevelJokers(scoringJokers, {
      playedHandLabel: "High Card",
    });
    expect(result.xMult).toBe(LOYALTY_CARD_X_MULT);
  });

  test("does not fire on the 5th played hand through the pipeline (negative)", () => {
    const beforeFifth = playN(LOYALTY_CARD_HANDS_PER_TRIGGER - 2);
    const scoringJokers = advanceStackGainsForScoring(beforeFifth, HC_CTX);
    const result = applyHandLevelJokers(scoringJokers, {
      playedHandLabel: "High Card",
    });
    expect(result.xMult).toBe(1);
  });

  test("fires X4 on the 12th played hand through the pipeline (second cycle)", () => {
    const beforeTwelfth = playN(LOYALTY_CARD_HANDS_PER_TRIGGER * 2 - 1);
    const scoringJokers = advanceStackGainsForScoring(beforeTwelfth, HC_CTX);
    const result = applyHandLevelJokers(scoringJokers, {
      playedHandLabel: "High Card",
    });
    expect(result.xMult).toBe(LOYALTY_CARD_X_MULT);
  });
});
