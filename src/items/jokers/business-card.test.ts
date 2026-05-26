// @vitest-environment node
import {
  applyJokersToScoring,
  createBusinessCardJoker,
} from "../jokers";
import type { Card, Rank, Suit } from "../../cards/types";

let nextId = 0;
function card(rank: Rank, suit: Suit = "spades"): Card {
  return { id: ++nextId, rank, suit };
}

beforeEach(() => {
  nextId = 0;
});

describe("applyJokersToScoring — Business Card joker", () => {
  test("awards $1 per face card when every roll procs", () => {
    const rng = (): number => 0;
    const scored = [card("J"), card("Q"), card("K")];
    const result = applyJokersToScoring([createBusinessCardJoker()], scored, rng);
    expect(result.moneyEarned).toBe(3);
  });

  test("awards $0 when no rolls proc", () => {
    const rng = (): number => 0.99;
    const scored = [card("J"), card("Q"), card("K")];
    const result = applyJokersToScoring([createBusinessCardJoker()], scored, rng);
    expect(result.moneyEarned).toBe(0);
  });

  test("ignores non-face cards even when rolls would proc", () => {
    const rng = (): number => 0;
    const scored = [card("2"), card("5"), card("A")];
    const result = applyJokersToScoring([createBusinessCardJoker()], scored, rng);
    expect(result.moneyEarned).toBe(0);
  });

  test("rolls independently per face card using the provided RNG sequence", () => {
    const rolls = [0.1, 0.9, 0.1];
    let i = 0;
    const rng = (): number => {
      const value = rolls[i];
      i += 1;
      return value;
    };
    const scored = [card("J"), card("Q"), card("K")];
    const result = applyJokersToScoring([createBusinessCardJoker()], scored, rng);
    expect(result.moneyEarned).toBe(2);
  });

  test("does not change mult", () => {
    const rng = (): number => 0;
    const scored = [card("J")];
    const result = applyJokersToScoring([createBusinessCardJoker()], scored, rng);
    expect(result.additiveMult).toBe(0);
  });
});
