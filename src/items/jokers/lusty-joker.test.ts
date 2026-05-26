// @vitest-environment node
import {
  SUIT_MULT_AMOUNT,
  applyPerCardJokers,
  createLustyJoker,
} from "../jokers";
import type { Card, Rank, Suit } from "../../cards/types";

let nextId = 0;
function card(rank: Rank, suit: Suit = "spades"): Card {
  return { id: ++nextId, rank, suit };
}

beforeEach(() => {
  nextId = 0;
});

describe("applyPerCardJokers — Lusty Joker", () => {
  test("adds SUIT_MULT_AMOUNT when scored card is a Heart", () => {
    const result = applyPerCardJokers([createLustyJoker()], card("9", "hearts"));
    expect(result.additiveMult).toBe(SUIT_MULT_AMOUNT);
  });

  test("reports Lusty Joker as fired on a Heart", () => {
    const result = applyPerCardJokers([createLustyJoker()], card("9", "hearts"));
    expect(result.firedJokerIds).toEqual(["lusty-joker"]);
  });

  test("does not add mult when scored card is not a Heart", () => {
    const result = applyPerCardJokers([createLustyJoker()], card("9", "clubs"));
    expect(result.additiveMult).toBe(0);
  });

  test("does not fire on a non-Heart card", () => {
    const result = applyPerCardJokers([createLustyJoker()], card("9", "clubs"));
    expect(result.firedJokerIds).toEqual([]);
  });
});
