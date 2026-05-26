// @vitest-environment node
import {
  SUIT_MULT_AMOUNT,
  applyPerCardJokers,
  createGreedyJoker,
} from "../jokers";
import type { Card, Rank, Suit } from "../../cards/types";

let nextId = 0;
function card(rank: Rank, suit: Suit = "spades"): Card {
  return { id: ++nextId, rank, suit };
}

beforeEach(() => {
  nextId = 0;
});

describe("applyPerCardJokers — Greedy Joker", () => {
  test("adds SUIT_MULT_AMOUNT when scored card is a Diamond", () => {
    const result = applyPerCardJokers([createGreedyJoker()], card("5", "diamonds"));
    expect(result.additiveMult).toBe(SUIT_MULT_AMOUNT);
  });

  test("reports Greedy Joker as fired on a Diamond", () => {
    const result = applyPerCardJokers([createGreedyJoker()], card("5", "diamonds"));
    expect(result.firedJokerIds).toEqual(["greedy-joker"]);
  });

  test("does not add mult when scored card is not a Diamond", () => {
    const result = applyPerCardJokers([createGreedyJoker()], card("5", "spades"));
    expect(result.additiveMult).toBe(0);
  });

  test("does not fire on a non-Diamond card", () => {
    const result = applyPerCardJokers([createGreedyJoker()], card("5", "spades"));
    expect(result.firedJokerIds).toEqual([]);
  });
});
