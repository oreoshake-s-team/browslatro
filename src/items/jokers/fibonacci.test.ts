// @vitest-environment node
import {
  FIBONACCI_MULT,
  applyJokersToScoring,
  applyPerCardJokers,
  createFibonacciJoker,
} from "../jokers";
import type { Card, Rank, Suit } from "../../cards/types";

let nextId = 0;
function card(rank: Rank, suit: Suit = "spades"): Card {
  return { id: ++nextId, rank, suit };
}

beforeEach(() => {
  nextId = 0;
});

describe("Fibonacci joker", () => {
  test("adds FIBONACCI_MULT mult per scored Fibonacci-rank card", () => {
    const scored = [card("A"), card("2"), card("3"), card("5"), card("8")];
    const result = applyJokersToScoring([createFibonacciJoker()], scored);
    expect(result.additiveMult).toBe(FIBONACCI_MULT * 5);
  });

  test("contributes no mult when no Fibonacci ranks are scored", () => {
    const scored = [card("4"), card("6"), card("7"), card("9"), card("10")];
    const result = applyJokersToScoring([createFibonacciJoker()], scored);
    expect(result.additiveMult).toBe(0);
  });

  test("does not change chips", () => {
    const scored = [card("A"), card("8")];
    const result = applyJokersToScoring([createFibonacciJoker()], scored);
    expect(result.additiveChips).toBe(0);
  });

  test("fires on a matching rank in applyPerCardJokers", () => {
    const result = applyPerCardJokers([createFibonacciJoker()], card("5"));
    expect(result.firedJokerIds).toEqual(["fibonacci"]);
  });

  test("does not fire on a non-Fibonacci rank in applyPerCardJokers", () => {
    const result = applyPerCardJokers([createFibonacciJoker()], card("7"));
    expect(result.firedJokerIds).toEqual([]);
  });
});
