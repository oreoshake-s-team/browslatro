// @vitest-environment node
import {
  BLUE_JOKER_CHIPS_PER_REMAINING_CARD,
  applyHandLevelJokers,
  applyPerCardJokers,
  createBlueJoker,
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

describe("Blue Joker", () => {
  test("adds amount × remaining for a small remaining deck", () => {
    const result = applyHandLevelJokers([createBlueJoker()], {
      remainingDeck: deckOfSize(7),
    });
    expect(result.additiveChips).toBe(BLUE_JOKER_CHIPS_PER_REMAINING_CARD * 7);
  });

  test("scales with a larger remaining deck", () => {
    const result = applyHandLevelJokers([createBlueJoker()], {
      remainingDeck: deckOfSize(40),
    });
    expect(result.additiveChips).toBe(BLUE_JOKER_CHIPS_PER_REMAINING_CARD * 40);
  });

  test("fires when remaining deck is non-empty", () => {
    const result = applyHandLevelJokers([createBlueJoker()], {
      remainingDeck: deckOfSize(1),
    });
    expect(result.firedJokerIds).toEqual(["blue-joker"]);
  });

  test("does not fire when remaining deck is empty (negative)", () => {
    const result = applyHandLevelJokers([createBlueJoker()], {
      remainingDeck: [],
    });
    expect(result.firedJokerIds).toEqual([]);
  });

  test("contributes 0 chips when remainingDeck is missing from context", () => {
    const result = applyHandLevelJokers([createBlueJoker()], {});
    expect(result.additiveChips).toBe(0);
  });

  test("does not contribute in the per-card pass", () => {
    const result = applyPerCardJokers([createBlueJoker()], card());
    expect(result.firedJokerIds).toEqual([]);
  });

  test("is a common joker", () => {
    expect(createBlueJoker().rarity).toBe<JokerRarity>("common");
  });
});
