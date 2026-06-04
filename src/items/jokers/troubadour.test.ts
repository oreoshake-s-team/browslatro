// @vitest-environment node
import {
  TROUBADOUR_HAND_SIZE,
  TROUBADOUR_HANDS,
  applyHandLevelJokers,
  applyPerCardJokers,
  createTroubadourJoker,
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

describe("Troubadour", () => {
  test("is an uncommon joker", () => {
    expect(createTroubadourJoker().rarity).toBe<JokerRarity>("uncommon");
  });

  test("does not contribute additive chips or mult on play", () => {
    const result = applyHandLevelJokers([createTroubadourJoker()], {
      scoredCards: [card()],
    });
    expect(result.additiveMult + result.additiveChips).toBe(0);
  });

  test("does not contribute in the per-card pass", () => {
    const result = applyPerCardJokers([createTroubadourJoker()], card());
    expect(result.firedJokerIds).toEqual([]);
  });

  test("adds +2 starting hand size", () => {
    expect(extraStartingHandSizeFromJokers([createTroubadourJoker()])).toBe(
      TROUBADOUR_HAND_SIZE,
    );
  });

  test("subtracts 1 from starting hands", () => {
    expect(extraStartingHandsFromJokers([createTroubadourJoker()])).toBe(
      TROUBADOUR_HANDS,
    );
  });

  test("does not change starting discards (negative)", () => {
    expect(extraStartingDiscardsFromJokers([createTroubadourJoker()])).toBe(0);
  });
});
