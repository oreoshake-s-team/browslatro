// @vitest-environment node
import {
  SUIT_MULT_AMOUNT,
  applyPerCardJokers,
  createWrathfulJoker,
} from "../jokers";
import type { Card, Rank, Suit } from "../../cards/types";

let nextId = 0;
function card(rank: Rank, suit: Suit = "spades"): Card {
  return { id: ++nextId, rank, suit };
}

beforeEach(() => {
  nextId = 0;
});

describe("applyPerCardJokers — Wrathful Joker", () => {
  test("adds SUIT_MULT_AMOUNT when scored card is a Spade", () => {
    const result = applyPerCardJokers([createWrathfulJoker()], card("K", "spades"));
    expect(result.additiveMult).toBe(SUIT_MULT_AMOUNT);
  });

  test("reports Wrathful Joker as fired on a Spade", () => {
    const result = applyPerCardJokers([createWrathfulJoker()], card("K", "spades"));
    expect(result.firedJokerIds).toEqual(["wrathful-joker"]);
  });

  test("does not add mult when scored card is not a Spade", () => {
    const result = applyPerCardJokers([createWrathfulJoker()], card("K", "hearts"));
    expect(result.additiveMult).toBe(0);
  });

  test("does not fire on a non-Spade card", () => {
    const result = applyPerCardJokers([createWrathfulJoker()], card("K", "hearts"));
    expect(result.firedJokerIds).toEqual([]);
  });
});
