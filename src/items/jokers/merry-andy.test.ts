// @vitest-environment node
import {
  MERRY_ANDY_DISCARDS,
  MERRY_ANDY_HAND_SIZE,
  applyHandLevelJokers,
  applyPerCardJokers,
  createMerryAndyJoker,
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

describe("Merry Andy", () => {
  test("is an uncommon joker", () => {
    expect(createMerryAndyJoker().rarity).toBe<JokerRarity>("uncommon");
  });

  test("does not contribute additive chips or mult on play", () => {
    const result = applyHandLevelJokers([createMerryAndyJoker()], {
      scoredCards: [card()],
    });
    expect(result.additiveMult + result.additiveChips).toBe(0);
  });

  test("does not contribute in the per-card pass", () => {
    const result = applyPerCardJokers([createMerryAndyJoker()], card());
    expect(result.firedJokerIds).toEqual([]);
  });

  test("adds +3 starting discards", () => {
    expect(extraStartingDiscardsFromJokers([createMerryAndyJoker()])).toBe(
      MERRY_ANDY_DISCARDS,
    );
  });

  test("subtracts 1 from starting hand size", () => {
    expect(extraStartingHandSizeFromJokers([createMerryAndyJoker()])).toBe(
      MERRY_ANDY_HAND_SIZE,
    );
  });

  test("does not change starting hands (negative)", () => {
    expect(extraStartingHandsFromJokers([createMerryAndyJoker()])).toBe(0);
  });
});
