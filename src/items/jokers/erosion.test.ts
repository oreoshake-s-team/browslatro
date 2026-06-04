// @vitest-environment node
import {
  EROSION_BASE_DECK_SIZE,
  EROSION_MULT_PER_MISSING_CARD,
  applyHandLevelJokers,
  applyPerCardJokers,
  createErosionJoker,
} from "../jokers";
import type { JokerRarity } from "../jokers";
import type { Card, Rank, Suit } from "../../cards/types";

let nextId = 0;
function card(rank: Rank = "5", suit: Suit = "spades"): Card {
  return { id: ++nextId, rank, suit };
}
function deckOfSize(n: number): Card[] {
  const out: Card[] = [];
  for (let i = 0; i < n; i += 1) out.push(card());
  return out;
}

beforeEach(() => {
  nextId = 0;
});

describe("Erosion", () => {
  test("adds 0 mult when the full deck has the base size", () => {
    const result = applyHandLevelJokers([createErosionJoker()], {
      fullDeck: deckOfSize(EROSION_BASE_DECK_SIZE),
    });
    expect(result.additiveMult).toBe(0);
  });

  test("does not fire when the full deck has the base size (negative)", () => {
    const result = applyHandLevelJokers([createErosionJoker()], {
      fullDeck: deckOfSize(EROSION_BASE_DECK_SIZE),
    });
    expect(result.firedJokerIds).toEqual([]);
  });

  test("adds +amount mult when 1 card is missing from the full deck", () => {
    const result = applyHandLevelJokers([createErosionJoker()], {
      fullDeck: deckOfSize(EROSION_BASE_DECK_SIZE - 1),
    });
    expect(result.additiveMult).toBe(EROSION_MULT_PER_MISSING_CARD);
  });

  test("scales linearly with the number of missing cards", () => {
    const missing = 10;
    const result = applyHandLevelJokers([createErosionJoker()], {
      fullDeck: deckOfSize(EROSION_BASE_DECK_SIZE - missing),
    });
    expect(result.additiveMult).toBe(
      EROSION_MULT_PER_MISSING_CARD * missing,
    );
  });

  test("does not go negative if the deck is somehow larger than the base size (defensive)", () => {
    const result = applyHandLevelJokers([createErosionJoker()], {
      fullDeck: deckOfSize(EROSION_BASE_DECK_SIZE + 5),
    });
    expect(result.additiveMult).toBe(0);
  });

  test("adds 0 mult when fullDeck is missing from context", () => {
    const result = applyHandLevelJokers([createErosionJoker()], {});
    expect(result.additiveMult).toBe(0);
  });

  test("does not contribute in the per-card pass", () => {
    const result = applyPerCardJokers([createErosionJoker()], card());
    expect(result.firedJokerIds).toEqual([]);
  });

  test("is an uncommon joker", () => {
    expect(createErosionJoker().rarity).toBe<JokerRarity>("uncommon");
  });
});
