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
      "Two Pair",
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
    jokers = applyHandPlayedToJokerStates(jokers, "Two Pair");
    jokers = applyHandPlayedToJokerStates(jokers, "Two Pair");
    jokers = applyHandPlayedToJokerStates(jokers, "Two Pair");
    expect(jokers[0].state).toEqual({
      kind: "counter",
      value: SPARE_TROUSERS_MULT_PER_TWO_PAIR * 3,
    });
  });

  test("non-Two-Pair hands do not increment state (negative)", () => {
    let jokers = [createSpareTrousersJoker()];
    jokers = applyHandPlayedToJokerStates(jokers, "High Card");
    jokers = applyHandPlayedToJokerStates(jokers, "Pair");
    jokers = applyHandPlayedToJokerStates(jokers, "Three of a Kind");
    expect(jokers[0].state).toEqual({ kind: "counter", value: 0 });
  });

  test("Full House does not increment state (negative — matches Balatro's hand-contains rules, Two Pair is not in Full House's contains-set)", () => {
    const [updated] = applyHandPlayedToJokerStates(
      [createSpareTrousersJoker()],
      "Full House",
    );
    expect(updated.state).toEqual({ kind: "counter", value: 0 });
  });
});
