// @vitest-environment node
import {
  GREEN_JOKER_MULT_PER_HAND,
  applyDiscardToJokerStates,
  applyHandLevelJokers,
  applyHandPlayedToJokerStates,
  createGreenJokerJoker,
  createJokerCatalog,
} from "../jokers";

describe("Green Joker", () => {
  test("is registered in the joker catalog", () => {
    const ids = createJokerCatalog().map((j) => j.id);
    expect(ids).toContain("green-joker");
  });

  test("starts with state.value 0", () => {
    expect(createGreenJokerJoker().state).toEqual({ kind: "counter", value: 0 });
  });

  test("playing a hand grows the counter by GREEN_JOKER_MULT_PER_HAND", () => {
    const [updated] = applyHandPlayedToJokerStates([createGreenJokerJoker()], {
      playedHandLabel: "Pair",
      playedCardCount: 2,
      scoredCards: [],
    });
    expect(updated.state).toEqual({
      kind: "counter",
      value: GREEN_JOKER_MULT_PER_HAND,
    });
  });

  test("a discard shrinks the counter by 1", () => {
    let jokers = applyHandPlayedToJokerStates([createGreenJokerJoker()], {
      playedHandLabel: "Pair",
      playedCardCount: 2,
      scoredCards: [],
    });
    jokers = applyHandPlayedToJokerStates(jokers, {
      playedHandLabel: "Pair",
      playedCardCount: 2,
      scoredCards: [],
    });
    const [updated] = applyDiscardToJokerStates(jokers);
    expect(updated.state).toEqual({ kind: "counter", value: 1 });
  });

  test("a discard never takes the counter below 0 (negative)", () => {
    const [updated] = applyDiscardToJokerStates([createGreenJokerJoker()]);
    expect(updated.state).toEqual({ kind: "counter", value: 0 });
  });

  test("scoring adds the accumulated counter as additive mult", () => {
    const jokers = applyHandPlayedToJokerStates([createGreenJokerJoker()], {
      playedHandLabel: "Pair",
      playedCardCount: 2,
      scoredCards: [],
    });
    const result = applyHandLevelJokers(jokers, { playedHandLabel: "Pair" });
    expect(result.additiveMult).toBe(GREEN_JOKER_MULT_PER_HAND);
  });

  test("contributes no mult while the counter is 0 (negative)", () => {
    const result = applyHandLevelJokers([createGreenJokerJoker()], {
      playedHandLabel: "Pair",
    });
    expect(result.additiveMult).toBe(0);
  });

  test("discards do not touch other jokers' states (negative)", () => {
    const other = createJokerCatalog().find((j) => j.id === "ride-the-bus");
    if (!other) throw new Error("ride-the-bus missing from catalog");
    const [updated] = applyDiscardToJokerStates([other]);
    expect(updated.state).toEqual(other.state);
  });
});
