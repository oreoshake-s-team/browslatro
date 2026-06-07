// @vitest-environment node
import {
  applyHandLevelJokers,
  applyHandPlayedToJokerStates,
  createJokerCatalog,
  createWeeJokerJoker,
  WEE_JOKER_CHIPS_PER_TWO,
} from "../jokers";
import type { Card, Rank, Suit } from "../../cards/types";

let nextId = 0;
function card(rank: Rank, suit: Suit = "spades"): Card {
  return { id: ++nextId, rank, suit };
}

beforeEach(() => {
  nextId = 0;
});

describe("Wee Joker (#825)", () => {
  test("is registered in the joker catalog", () => {
    const ids = createJokerCatalog().map((j) => j.id);
    expect(ids).toContain("wee-joker");
  });

  test("starts with state.value 0", () => {
    expect(createWeeJokerJoker().state).toEqual({ kind: "counter", value: 0 });
  });

  test("contributes 0 chips on the first hand (state still 0)", () => {
    const result = applyHandLevelJokers([createWeeJokerJoker()], {
      playedHandLabel: "High Card",
    });
    expect(result.additiveChips).toBe(0);
  });

  test("bumps state by WEE_JOKER_CHIPS_PER_TWO per played 2", () => {
    const [updated] = applyHandPlayedToJokerStates([createWeeJokerJoker()], {
      playedHandLabel: "Three of a Kind",
      playedCardCount: 3,
      scoredCards: [card("2"), card("2"), card("2")],
    });
    expect(updated.state).toEqual({
      kind: "counter",
      value: WEE_JOKER_CHIPS_PER_TWO * 3,
    });
  });

  test("the accumulated state is applied as additive chips on the next scoring", () => {
    const joker = {
      ...createWeeJokerJoker(),
      state: { kind: "counter" as const, value: 24 },
    };
    const result = applyHandLevelJokers([joker], { playedHandLabel: "Pair" });
    expect(result.additiveChips).toBe(24);
  });

  test("a hand with no 2s does not increment state (negative)", () => {
    const [updated] = applyHandPlayedToJokerStates([createWeeJokerJoker()], {
      playedHandLabel: "Pair",
      playedCardCount: 2,
      scoredCards: [card("K"), card("K")],
    });
    expect(updated.state).toEqual({ kind: "counter", value: 0 });
  });

  test("a hand with one 2 increments state by WEE_JOKER_CHIPS_PER_TWO", () => {
    const [updated] = applyHandPlayedToJokerStates([createWeeJokerJoker()], {
      playedHandLabel: "Pair",
      playedCardCount: 2,
      scoredCards: [card("2"), card("K")],
    });
    expect(updated.state).toEqual({
      kind: "counter",
      value: WEE_JOKER_CHIPS_PER_TWO,
    });
  });
});
