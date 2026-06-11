// @vitest-environment node
import {
  CARD_SHARP_X_MULT,
  applyHandLevelJokers,
  createCardSharpJoker,
  createJokerCatalog,
} from "../jokers";

describe("Card Sharp", () => {
  test("is registered in the joker catalog", () => {
    const ids = createJokerCatalog().map((j) => j.id);
    expect(ids).toContain("card-sharp");
  });

  test("applies X3 Mult when the played hand was already played this round", () => {
    const result = applyHandLevelJokers([createCardSharpJoker()], {
      playedHandLabel: "Pair",
      handLabelsThisRound: ["High Card", "Pair"],
    });
    expect(result.xMult).toBe(CARD_SHARP_X_MULT);
  });

  test("does not fire when the hand type is new this round (negative)", () => {
    const result = applyHandLevelJokers([createCardSharpJoker()], {
      playedHandLabel: "Pair",
      handLabelsThisRound: ["High Card", "Flush"],
    });
    expect(result.xMult).toBe(1);
  });

  test("does not fire on the first hand of the round (negative)", () => {
    const result = applyHandLevelJokers([createCardSharpJoker()], {
      playedHandLabel: "Pair",
      handLabelsThisRound: [],
    });
    expect(result.xMult).toBe(1);
  });

  test("does not fire when the round history is not provided (negative)", () => {
    const result = applyHandLevelJokers([createCardSharpJoker()], {
      playedHandLabel: "Pair",
    });
    expect(result.xMult).toBe(1);
  });

  test("fires again on the third repeat of the same hand type", () => {
    const result = applyHandLevelJokers([createCardSharpJoker()], {
      playedHandLabel: "Pair",
      handLabelsThisRound: ["Pair", "Pair"],
    });
    expect(result.xMult).toBe(CARD_SHARP_X_MULT);
  });
});
