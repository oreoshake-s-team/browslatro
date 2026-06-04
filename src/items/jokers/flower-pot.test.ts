// @vitest-environment node
import {
  FLOWER_POT_X_MULT,
  applyHandLevelJokers,
  applyPerCardJokers,
  createFlowerPotJoker,
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

describe("Flower Pot", () => {
  test("multiplies xMult when scored hand has all four suits", () => {
    const result = applyHandLevelJokers([createFlowerPotJoker()], {
      scoredCards: [
        card("5", "spades"),
        card("5", "hearts"),
        card("5", "diamonds"),
        card("5", "clubs"),
      ],
    });
    expect(result.xMult).toBe(FLOWER_POT_X_MULT);
  });

  test("fires when all four suits are represented", () => {
    const result = applyHandLevelJokers([createFlowerPotJoker()], {
      scoredCards: [
        card("A", "spades"),
        card("K", "hearts"),
        card("Q", "diamonds"),
        card("J", "clubs"),
      ],
    });
    expect(result.firedJokerIds).toEqual(["flower-pot"]);
  });

  test("works on five-card hands with all four suits present (any extra dup)", () => {
    const result = applyHandLevelJokers([createFlowerPotJoker()], {
      scoredCards: [
        card("5", "spades"),
        card("5", "hearts"),
        card("5", "diamonds"),
        card("5", "clubs"),
        card("5", "spades"),
      ],
    });
    expect(result.xMult).toBe(FLOWER_POT_X_MULT);
  });

  test("does not fire when one suit is missing (negative)", () => {
    const result = applyHandLevelJokers([createFlowerPotJoker()], {
      scoredCards: [
        card("5", "spades"),
        card("5", "hearts"),
        card("5", "diamonds"),
      ],
    });
    expect(result.xMult).toBe(1);
  });

  test("does not fire on a flush — all one suit (negative)", () => {
    const result = applyHandLevelJokers([createFlowerPotJoker()], {
      scoredCards: [
        card("5", "spades"),
        card("6", "spades"),
        card("7", "spades"),
        card("8", "spades"),
        card("9", "spades"),
      ],
    });
    expect(result.xMult).toBe(1);
  });

  test("does not fire when scoredCards is empty (negative)", () => {
    const result = applyHandLevelJokers([createFlowerPotJoker()], {
      scoredCards: [],
    });
    expect(result.xMult).toBe(1);
  });

  test("does not fire when scoredCards is missing from context (negative)", () => {
    const result = applyHandLevelJokers([createFlowerPotJoker()], {});
    expect(result.xMult).toBe(1);
  });

  test("does not contribute in the per-card pass", () => {
    const result = applyPerCardJokers([createFlowerPotJoker()], card());
    expect(result.firedJokerIds).toEqual([]);
  });

  test("is an uncommon joker", () => {
    expect(createFlowerPotJoker().rarity).toBe<JokerRarity>("uncommon");
  });
});
