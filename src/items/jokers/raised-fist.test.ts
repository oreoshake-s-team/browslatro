// @vitest-environment node
import {
  RAISED_FIST_MULTIPLIER,
  applyHandLevelJokers,
  applyPerCardJokers,
  createRaisedFistJoker,
} from "../jokers";
import type { JokerRarity } from "../jokers";
import type { Card, Rank, Suit } from "../../cards/types";

let nextId = 0;
function card(rank: Rank, suit: Suit = "spades"): Card {
  return { id: ++nextId, rank, suit };
}

beforeEach(() => {
  nextId = 0;
});

describe("Raised Fist joker", () => {
  test("adds double the lowest held card's rank value to mult", () => {
    const result = applyHandLevelJokers([createRaisedFistJoker()], {
      heldInHandCards: [card("5"), card("K")],
    });
    expect(result.additiveMult).toBe(RAISED_FIST_MULTIPLIER * 5);
  });

  test("treats an Ace as the high card, not the lowest", () => {
    const result = applyHandLevelJokers([createRaisedFistJoker()], {
      heldInHandCards: [card("K"), card("A")],
    });
    expect(result.additiveMult).toBe(RAISED_FIST_MULTIPLIER * 10);
  });

  test("uses the Ace value when an Ace is the only card held", () => {
    const result = applyHandLevelJokers([createRaisedFistJoker()], {
      heldInHandCards: [card("A")],
    });
    expect(result.additiveMult).toBe(RAISED_FIST_MULTIPLIER * 11);
  });

  test("adds no mult when no cards are held", () => {
    const result = applyHandLevelJokers([createRaisedFistJoker()], {
      heldInHandCards: [],
    });
    expect(result.additiveMult).toBe(0);
  });

  test("does not fire when no cards are held", () => {
    const result = applyHandLevelJokers([createRaisedFistJoker()], {
      heldInHandCards: [],
    });
    expect(result.firedJokerIds).toEqual([]);
  });

  test("does not contribute in the per-card pass", () => {
    const result = applyPerCardJokers([createRaisedFistJoker()], card("2"));
    expect(result.firedJokerIds).toEqual([]);
  });

  test("is a common joker", () => {
    expect(createRaisedFistJoker().rarity).toBe<JokerRarity>("common");
  });
});
