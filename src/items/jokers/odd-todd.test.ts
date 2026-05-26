// @vitest-environment node
import {
  ODD_TODD_CHIPS,
  applyJokersToScoring,
  applyPerCardJokers,
  createOddToddJoker,
} from "../jokers";
import type { Card, Rank, Suit } from "../../cards/types";

let nextId = 0;
function card(rank: Rank, suit: Suit = "spades"): Card {
  return { id: ++nextId, rank, suit };
}

beforeEach(() => {
  nextId = 0;
});

describe("Odd Todd joker", () => {
  test("adds ODD_TODD_CHIPS per scored odd-rank card", () => {
    const result = applyPerCardJokers([createOddToddJoker()], card("3"));
    expect(result.additiveChips).toBe(ODD_TODD_CHIPS);
  });

  test("counts Ace as an odd-rank card", () => {
    const result = applyPerCardJokers([createOddToddJoker()], card("A"));
    expect(result.additiveChips).toBe(ODD_TODD_CHIPS);
  });

  test("does not proc on an even-rank card", () => {
    const result = applyPerCardJokers([createOddToddJoker()], card("8"));
    expect(result.additiveChips).toBe(0);
  });

  test("does not proc on a face card", () => {
    const result = applyPerCardJokers([createOddToddJoker()], card("Q"));
    expect(result.additiveChips).toBe(0);
  });

  test("contributes per-card additive chips into the aggregated scoring result", () => {
    const result = applyJokersToScoring(
      [createOddToddJoker()],
      [card("3"), card("A"), card("4")],
    );
    expect(result.additiveChips).toBe(ODD_TODD_CHIPS * 2);
  });
});
