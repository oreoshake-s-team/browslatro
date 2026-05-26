// @vitest-environment node
import {
  SMILEY_FACE_MULT,
  applyJokersToScoring,
  applyPerCardJokers,
  createSmileyFaceJoker,
} from "../jokers";
import type { Card, Rank, Suit } from "../../cards/types";

let nextId = 0;
function card(rank: Rank, suit: Suit = "spades"): Card {
  return { id: ++nextId, rank, suit };
}

beforeEach(() => {
  nextId = 0;
});

describe("Smiley Face joker", () => {
  test("adds SMILEY_FACE_MULT mult per scored face card", () => {
    const scored = [card("J"), card("Q"), card("K")];
    const result = applyJokersToScoring([createSmileyFaceJoker()], scored);
    expect(result.additiveMult).toBe(SMILEY_FACE_MULT * 3);
  });

  test("contributes no mult when no face cards are scored", () => {
    const scored = [card("2"), card("5"), card("A")];
    const result = applyJokersToScoring([createSmileyFaceJoker()], scored);
    expect(result.additiveMult).toBe(0);
  });

  test("does not change chips", () => {
    const scored = [card("J")];
    const result = applyJokersToScoring([createSmileyFaceJoker()], scored);
    expect(result.additiveChips).toBe(0);
  });

  test("fires on a Jack in applyPerCardJokers", () => {
    const result = applyPerCardJokers([createSmileyFaceJoker()], card("J"));
    expect(result.firedJokerIds).toEqual(["smiley-face"]);
  });

  test("does not fire on an Ace in applyPerCardJokers", () => {
    const result = applyPerCardJokers([createSmileyFaceJoker()], card("A"));
    expect(result.firedJokerIds).toEqual([]);
  });
});
