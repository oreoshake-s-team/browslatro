// @vitest-environment node
import {
  CLOUD_9_MONEY_PER_NINE,
  applyEndOfRoundJokers,
  applyHandLevelJokers,
  applyPerCardJokers,
  createCloud9Joker,
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

describe("Cloud 9", () => {
  test("pays CLOUD_9_MONEY_PER_NINE per 9 in the full deck at end of round", () => {
    const deck: Card[] = [
      card("9", "spades"),
      card("9", "hearts"),
      card("9", "diamonds"),
      card("9", "clubs"),
      card("2", "spades"),
    ];
    const result = applyEndOfRoundJokers([createCloud9Joker()], {
      fullDeck: deck,
    });
    expect(result.moneyEarned).toBe(CLOUD_9_MONEY_PER_NINE * 4);
  });

  test("emits a single step crediting Cloud 9 with the total", () => {
    const deck: Card[] = [card("9", "spades"), card("9", "hearts")];
    const result = applyEndOfRoundJokers([createCloud9Joker()], {
      fullDeck: deck,
    });
    expect(result.steps).toEqual([
      {
        jokerId: "cloud-9",
        jokerName: "Cloud 9",
        moneyEarned: CLOUD_9_MONEY_PER_NINE * 2,
      },
    ]);
  });

  test("pays nothing when the deck contains no 9s (negative)", () => {
    const deck: Card[] = [
      card("2", "spades"),
      card("8", "hearts"),
      card("K", "clubs"),
    ];
    const result = applyEndOfRoundJokers([createCloud9Joker()], {
      fullDeck: deck,
    });
    expect(result.moneyEarned).toBe(0);
  });

  test("does not fire when the deck contains no 9s (negative)", () => {
    const deck: Card[] = [card("8", "hearts")];
    const result = applyEndOfRoundJokers([createCloud9Joker()], {
      fullDeck: deck,
    });
    expect(result.steps).toEqual([]);
  });

  test("pays nothing when fullDeck is missing from context", () => {
    const result = applyEndOfRoundJokers([createCloud9Joker()], {});
    expect(result.moneyEarned).toBe(0);
  });

  test("pays nothing when fullDeck is empty", () => {
    const result = applyEndOfRoundJokers([createCloud9Joker()], {
      fullDeck: [],
    });
    expect(result.moneyEarned).toBe(0);
  });

  test("counts only 9s and ignores other ranks in the same deck", () => {
    const deck: Card[] = [
      card("9", "spades"),
      card("10", "spades"),
      card("9", "hearts"),
      card("8", "diamonds"),
      card("9", "clubs"),
    ];
    const result = applyEndOfRoundJokers([createCloud9Joker()], {
      fullDeck: deck,
    });
    expect(result.moneyEarned).toBe(CLOUD_9_MONEY_PER_NINE * 3);
  });

  test("does not contribute in the hand-level pass", () => {
    const result = applyHandLevelJokers([createCloud9Joker()]);
    expect(result.firedJokerIds).toEqual([]);
  });

  test("does not contribute in the per-card pass", () => {
    const result = applyPerCardJokers([createCloud9Joker()], card("9"));
    expect(result.firedJokerIds).toEqual([]);
  });

  test("is an uncommon joker", () => {
    expect(createCloud9Joker().rarity).toBe<JokerRarity>("uncommon");
  });
});
