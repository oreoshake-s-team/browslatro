// @vitest-environment node
import {
  SUIT_MULT_AMOUNT,
  applyPerCardJokers,
  createGluttonousJoker,
} from "../jokers";
import type { Card, Rank, Suit } from "../../cards/types";

let nextId = 0;
function card(rank: Rank, suit: Suit = "spades"): Card {
  return { id: ++nextId, rank, suit };
}

beforeEach(() => {
  nextId = 0;
});

describe("applyPerCardJokers — Gluttonous Joker", () => {
  test("adds SUIT_MULT_AMOUNT when scored card is a Club", () => {
    const result = applyPerCardJokers([createGluttonousJoker()], card("A", "clubs"));
    expect(result.additiveMult).toBe(SUIT_MULT_AMOUNT);
  });

  test("reports Gluttonous Joker as fired on a Club", () => {
    const result = applyPerCardJokers([createGluttonousJoker()], card("A", "clubs"));
    expect(result.firedJokerIds).toEqual(["gluttonous-joker"]);
  });

  test("does not add mult when scored card is not a Club", () => {
    const result = applyPerCardJokers([createGluttonousJoker()], card("A", "diamonds"));
    expect(result.additiveMult).toBe(0);
  });

  test("does not fire on a non-Club card", () => {
    const result = applyPerCardJokers([createGluttonousJoker()], card("A", "diamonds"));
    expect(result.firedJokerIds).toEqual([]);
  });
});
