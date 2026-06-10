// @vitest-environment node
import {
  applyHandLevelJokers,
  applyHandPlayedToJokerStates,
  createJokerCatalog,
  createRideTheBusJoker,
  RIDE_THE_BUS_MULT_PER_FACELESS_HAND,
} from "../jokers";
import type { Card, Rank, Suit } from "../../cards/types";

let nextId = 0;
function card(rank: Rank, suit: Suit = "spades"): Card {
  return { id: ++nextId, rank, suit };
}

beforeEach(() => {
  nextId = 0;
});

describe("Ride the Bus joker (#837)", () => {
  test("is registered in the joker catalog", () => {
    const ids = createJokerCatalog().map((j) => j.id);
    expect(ids).toContain("ride-the-bus");
  });

  test("starts with state.value 0", () => {
    expect(createRideTheBusJoker().state).toEqual({ kind: "counter", value: 0 });
  });

  test("contributes 0 mult on the first hand (state still 0)", () => {
    const result = applyHandLevelJokers([createRideTheBusJoker()], {
      playedHandLabel: "High Card",
    });
    expect(result.additiveMult).toBe(0);
  });

  test("a faceless hand increments state by RIDE_THE_BUS_MULT_PER_FACELESS_HAND", () => {
    const [updated] = applyHandPlayedToJokerStates([createRideTheBusJoker()], {
      playedHandLabel: "Pair",
      playedCardCount: 2,
      scoredCards: [card("5"), card("5")],
    });
    expect(updated.state).toEqual({
      kind: "counter",
      value: RIDE_THE_BUS_MULT_PER_FACELESS_HAND,
    });
  });

  test("stacks across three consecutive faceless hands", () => {
    let jokers = [createRideTheBusJoker()];
    const ctx = {
      playedHandLabel: "Pair" as const,
      playedCardCount: 2,
      scoredCards: [card("9"), card("9")],
    };
    jokers = applyHandPlayedToJokerStates(jokers, ctx);
    jokers = applyHandPlayedToJokerStates(jokers, ctx);
    jokers = applyHandPlayedToJokerStates(jokers, ctx);
    expect(jokers[0].state).toEqual({
      kind: "counter",
      value: RIDE_THE_BUS_MULT_PER_FACELESS_HAND * 3,
    });
  });

  test("the accumulated state is applied as additive mult on the next scoring", () => {
    const joker = {
      ...createRideTheBusJoker(),
      state: { kind: "counter" as const, value: 3 },
    };
    const result = applyHandLevelJokers([joker], {
      playedHandLabel: "High Card",
    });
    expect(result.additiveMult).toBe(3);
  });

  test("a scored Jack resets the counter to 0 (negative)", () => {
    let jokers = [createRideTheBusJoker()];
    jokers = applyHandPlayedToJokerStates(jokers, {
      playedHandLabel: "Pair",
      playedCardCount: 2,
      scoredCards: [card("5"), card("5")],
    });
    jokers = applyHandPlayedToJokerStates(jokers, {
      playedHandLabel: "Pair",
      playedCardCount: 2,
      scoredCards: [card("J"), card("5")],
    });
    expect(jokers[0].state).toEqual({ kind: "counter", value: 0 });
  });

  test("a scored Queen resets the counter (negative)", () => {
    const joker = {
      ...createRideTheBusJoker(),
      state: { kind: "counter" as const, value: 4 },
    };
    const [updated] = applyHandPlayedToJokerStates([joker], {
      playedHandLabel: "High Card",
      playedCardCount: 1,
      scoredCards: [card("Q")],
    });
    expect(updated.state).toEqual({ kind: "counter", value: 0 });
  });

  test("a scored King resets the counter (negative)", () => {
    const joker = {
      ...createRideTheBusJoker(),
      state: { kind: "counter" as const, value: 7 },
    };
    const [updated] = applyHandPlayedToJokerStates([joker], {
      playedHandLabel: "High Card",
      playedCardCount: 1,
      scoredCards: [card("K")],
    });
    expect(updated.state).toEqual({ kind: "counter", value: 0 });
  });

  test("an empty scored set increments (no faces present)", () => {
    const [updated] = applyHandPlayedToJokerStates([createRideTheBusJoker()], {
      playedHandLabel: "High Card",
      playedCardCount: 1,
      scoredCards: [],
    });
    expect(updated.state).toEqual({
      kind: "counter",
      value: RIDE_THE_BUS_MULT_PER_FACELESS_HAND,
    });
  });
});
