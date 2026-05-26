// @vitest-environment node
import {
  EVEN_STEVEN_MULT,
  applyJokersToScoring,
  applyPerCardJokers,
  createEvenStevenJoker,
} from "../jokers";
import type { Card, Rank, Suit } from "../../cards/types";

let nextId = 0;
function card(rank: Rank, suit: Suit = "spades"): Card {
  return { id: ++nextId, rank, suit };
}

beforeEach(() => {
  nextId = 0;
});

describe("Even Steven joker", () => {
  test("adds EVEN_STEVEN_MULT per scored even-rank card", () => {
    const result = applyPerCardJokers([createEvenStevenJoker()], card("4"));
    expect(result.additiveMult).toBe(EVEN_STEVEN_MULT);
  });

  test("does not proc on an odd-rank card", () => {
    const result = applyPerCardJokers([createEvenStevenJoker()], card("3"));
    expect(result.additiveMult).toBe(0);
  });

  test("does not proc on a face card", () => {
    const result = applyPerCardJokers([createEvenStevenJoker()], card("K"));
    expect(result.additiveMult).toBe(0);
  });

  test("contributes EVEN_STEVEN_MULT × even-card count across a played hand", () => {
    const result = applyJokersToScoring(
      [createEvenStevenJoker()],
      [card("2"), card("4"), card("7")],
    );
    expect(result.additiveMult).toBe(EVEN_STEVEN_MULT * 2);
  });
});
