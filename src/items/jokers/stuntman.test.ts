// @vitest-environment node
import {
  STUNTMAN_CHIPS,
  STUNTMAN_HAND_SIZE,
  applyHandLevelJokers,
  applyPerCardJokers,
  createStuntmanJoker,
  extraStartingDiscardsFromJokers,
  extraStartingHandSizeFromJokers,
  extraStartingHandsFromJokers,
} from "../jokers";
import type { JokerRarity } from "../jokers";
import type { Card, Rank, Suit } from "../../cards/types";

let nextId = 0;
function card(rank: Rank = "5", suit: Suit = "spades"): Card {
  return { id: ++nextId, rank, suit };
}

beforeEach(() => {
  nextId = 0;
});

describe("Stuntman", () => {
  test("is a rare joker", () => {
    expect(createStuntmanJoker().rarity).toBe<JokerRarity>("rare");
  });

  test("adds +STUNTMAN_CHIPS additive chips on every played hand", () => {
    const result = applyHandLevelJokers([createStuntmanJoker()], {
      scoredCards: [card()],
    });
    expect(result.additiveChips).toBe(STUNTMAN_CHIPS);
  });

  test("fires on every played hand", () => {
    const result = applyHandLevelJokers([createStuntmanJoker()], {
      scoredCards: [card()],
    });
    expect(result.firedJokerIds).toContain("stuntman");
  });

  test("does not add mult", () => {
    const result = applyHandLevelJokers([createStuntmanJoker()], {
      scoredCards: [card()],
    });
    expect(result.additiveMult).toBe(0);
  });

  test("does not contribute in the per-card pass", () => {
    const result = applyPerCardJokers([createStuntmanJoker()], card());
    expect(result.firedJokerIds).toEqual([]);
  });

  test("subtracts 2 from starting hand size", () => {
    expect(extraStartingHandSizeFromJokers([createStuntmanJoker()])).toBe(
      STUNTMAN_HAND_SIZE,
    );
  });

  test("does not change starting hands (negative)", () => {
    expect(extraStartingHandsFromJokers([createStuntmanJoker()])).toBe(0);
  });

  test("does not change starting discards (negative)", () => {
    expect(extraStartingDiscardsFromJokers([createStuntmanJoker()])).toBe(0);
  });
});
