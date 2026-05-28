// @vitest-environment node
import {
  SCHOLAR_CHIPS,
  SCHOLAR_MULT,
  applyJokersToScoring,
  applyPerCardJokers,
  createScholarJoker,
} from "../jokers";
import type { Card, Rank, Suit } from "../../cards/types";

let nextId = 0;
function card(rank: Rank, suit: Suit = "spades"): Card {
  return { id: ++nextId, rank, suit };
}

beforeEach(() => {
  nextId = 0;
});

describe("Scholar joker", () => {
  test("adds SCHOLAR_MULT mult per scored Ace", () => {
    const scored = [card("A"), card("A"), card("3")];
    const result = applyJokersToScoring([createScholarJoker()], scored);
    expect(result.additiveMult).toBe(SCHOLAR_MULT * 2);
  });

  test("adds SCHOLAR_CHIPS chips per scored Ace", () => {
    const scored = [card("A"), card("A"), card("3")];
    const result = applyJokersToScoring([createScholarJoker()], scored);
    expect(result.additiveChips).toBe(SCHOLAR_CHIPS * 2);
  });

  test("contributes no mult when no Aces are scored", () => {
    const scored = [card("2"), card("K"), card("10")];
    const result = applyJokersToScoring([createScholarJoker()], scored);
    expect(result.additiveMult).toBe(0);
  });

  test("contributes no chips when no Aces are scored", () => {
    const scored = [card("2"), card("K"), card("10")];
    const result = applyJokersToScoring([createScholarJoker()], scored);
    expect(result.additiveChips).toBe(0);
  });

  test("fires on an Ace in applyPerCardJokers", () => {
    const result = applyPerCardJokers([createScholarJoker()], card("A"));
    expect(result.firedJokerIds).toEqual(["scholar"]);
  });

  test("does not fire on a non-Ace in applyPerCardJokers", () => {
    const result = applyPerCardJokers([createScholarJoker()], card("K"));
    expect(result.firedJokerIds).toEqual([]);
  });
});
