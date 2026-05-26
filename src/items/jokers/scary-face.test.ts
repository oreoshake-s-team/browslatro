// @vitest-environment node
import {
  SCARY_FACE_CHIPS,
  applyJokersToScoring,
  applyPerCardJokers,
  createScaryFaceJoker,
} from "../jokers";
import type { Card, Rank, Suit } from "../../cards/types";

let nextId = 0;
function card(rank: Rank, suit: Suit = "spades"): Card {
  return { id: ++nextId, rank, suit };
}

beforeEach(() => {
  nextId = 0;
});

describe("Scary Face joker", () => {
  test("adds SCARY_FACE_CHIPS chips per scored face card", () => {
    const scored = [card("J"), card("Q"), card("5")];
    const result = applyJokersToScoring([createScaryFaceJoker()], scored);
    expect(result.additiveChips).toBe(SCARY_FACE_CHIPS * 2);
  });

  test("contributes no chips when no face cards are scored", () => {
    const scored = [card("2"), card("5"), card("A")];
    const result = applyJokersToScoring([createScaryFaceJoker()], scored);
    expect(result.additiveChips).toBe(0);
  });

  test("does not change mult", () => {
    const scored = [card("J")];
    const result = applyJokersToScoring([createScaryFaceJoker()], scored);
    expect(result.additiveMult).toBe(0);
  });

  test("fires once per scored face card in applyPerCardJokers", () => {
    const result = applyPerCardJokers([createScaryFaceJoker()], card("K"));
    expect(result.firedJokerIds).toEqual(["scary-face"]);
  });

  test("does not fire on a non-face card in applyPerCardJokers", () => {
    const result = applyPerCardJokers([createScaryFaceJoker()], card("7"));
    expect(result.firedJokerIds).toEqual([]);
  });
});
