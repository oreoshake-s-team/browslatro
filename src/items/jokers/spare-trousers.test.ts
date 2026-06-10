// @vitest-environment node
import {
  applyHandLevelJokers,
  applyHandPlayedToJokerStates,
  createJokerCatalog,
  createSpareTrousersJoker,
  SPARE_TROUSERS_MULT_PER_TWO_PAIR,
} from "../jokers";

describe("Spare Trousers joker (#804)", () => {
  test("is registered in the joker catalog", () => {
    const ids = createJokerCatalog().map((j) => j.id);
    expect(ids).toContain("spare-trousers");
  });

  test("starts with state.value 0 (fresh from factory)", () => {
    const joker = createSpareTrousersJoker();
    expect(joker.state).toEqual({ kind: "counter", value: 0 });
  });

  test("contributes 0 mult on the first hand (state still 0)", () => {
    const result = applyHandLevelJokers([createSpareTrousersJoker()], {
      playedHandLabel: "Two Pair",
    });
    expect(result.additiveMult).toBe(0);
  });

  test("applyHandPlayedToJokerStates bumps state by SPARE_TROUSERS_MULT_PER_TWO_PAIR after a Two Pair", () => {
    const [updated] = applyHandPlayedToJokerStates(
      [createSpareTrousersJoker()],
      { playedHandLabel: "Two Pair", playedCardCount: 4, scoredCards: [] },
    );
    expect(updated.state).toEqual({
      kind: "counter",
      value: SPARE_TROUSERS_MULT_PER_TWO_PAIR,
    });
  });

  test("the accumulated state is applied as additive mult on the next scoring", () => {
    const joker = {
      ...createSpareTrousersJoker(),
      state: { kind: "counter" as const, value: 6 },
    };
    const result = applyHandLevelJokers([joker], {
      playedHandLabel: "High Card",
    });
    expect(result.additiveMult).toBe(6);
  });

  test("scales across multiple Two Pair plays", () => {
    let jokers = [createSpareTrousersJoker()];
    jokers = applyHandPlayedToJokerStates(jokers, {
      playedHandLabel: "Two Pair",
      playedCardCount: 4,
      scoredCards: [],
    });
    jokers = applyHandPlayedToJokerStates(jokers, {
      playedHandLabel: "Two Pair",
      playedCardCount: 4,
      scoredCards: [],
    });
    jokers = applyHandPlayedToJokerStates(jokers, {
      playedHandLabel: "Two Pair",
      playedCardCount: 4,
      scoredCards: [],
    });
    expect(jokers[0].state).toEqual({
      kind: "counter",
      value: SPARE_TROUSERS_MULT_PER_TWO_PAIR * 3,
    });
  });

  test("non-Two-Pair hands do not increment state (negative)", () => {
    let jokers = [createSpareTrousersJoker()];
    jokers = applyHandPlayedToJokerStates(jokers, {
      playedHandLabel: "High Card",
      playedCardCount: 1,
      scoredCards: [],
    });
    jokers = applyHandPlayedToJokerStates(jokers, {
      playedHandLabel: "Pair",
      playedCardCount: 2,
      scoredCards: [],
    });
    jokers = applyHandPlayedToJokerStates(jokers, {
      playedHandLabel: "Three of a Kind",
      playedCardCount: 3,
      scoredCards: [],
    });
    expect(jokers[0].state).toEqual({ kind: "counter", value: 0 });
  });

  test("Full House increments state (contains Two Pair, issue #895)", () => {
    const [updated] = applyHandPlayedToJokerStates(
      [createSpareTrousersJoker()],
      { playedHandLabel: "Full House", playedCardCount: 5, scoredCards: [] },
    );
    expect(updated.state).toEqual({
      kind: "counter",
      value: SPARE_TROUSERS_MULT_PER_TWO_PAIR,
    });
  });

  test("Four of a Kind does not increment state (negative — no two distinct pairs)", () => {
    const [updated] = applyHandPlayedToJokerStates(
      [createSpareTrousersJoker()],
      { playedHandLabel: "Four of a Kind", playedCardCount: 5, scoredCards: [] },
    );
    expect(updated.state).toEqual({ kind: "counter", value: 0 });
  });
});
