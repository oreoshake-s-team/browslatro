// @vitest-environment node
import {
  WALKIE_TALKIE_CHIPS,
  WALKIE_TALKIE_MULT,
  applyJokersToScoring,
  applyPerCardJokers,
  createWalkieTalkieJoker,
} from "../jokers";
import type { Card, Rank, Suit } from "../../cards/types";

let nextId = 0;
function card(rank: Rank, suit: Suit = "spades"): Card {
  return { id: ++nextId, rank, suit };
}

beforeEach(() => {
  nextId = 0;
});

describe("Walkie Talkie joker", () => {
  test("adds WALKIE_TALKIE_MULT mult per scored 10 or 4", () => {
    const scored = [card("10"), card("4"), card("7")];
    const result = applyJokersToScoring([createWalkieTalkieJoker()], scored);
    expect(result.additiveMult).toBe(WALKIE_TALKIE_MULT * 2);
  });

  test("adds WALKIE_TALKIE_CHIPS chips per scored 10 or 4", () => {
    const scored = [card("10"), card("4"), card("7")];
    const result = applyJokersToScoring([createWalkieTalkieJoker()], scored);
    expect(result.additiveChips).toBe(WALKIE_TALKIE_CHIPS * 2);
  });

  test("contributes no mult when no 10s or 4s are scored", () => {
    const scored = [card("2"), card("5"), card("K")];
    const result = applyJokersToScoring([createWalkieTalkieJoker()], scored);
    expect(result.additiveMult).toBe(0);
  });

  test("contributes no chips when no 10s or 4s are scored", () => {
    const scored = [card("2"), card("5"), card("K")];
    const result = applyJokersToScoring([createWalkieTalkieJoker()], scored);
    expect(result.additiveChips).toBe(0);
  });

  test("fires on a 4 in applyPerCardJokers", () => {
    const result = applyPerCardJokers([createWalkieTalkieJoker()], card("4"));
    expect(result.firedJokerIds).toEqual(["walkie-talkie"]);
  });

  test("does not fire on a 5 in applyPerCardJokers", () => {
    const result = applyPerCardJokers([createWalkieTalkieJoker()], card("5"));
    expect(result.firedJokerIds).toEqual([]);
  });
});
