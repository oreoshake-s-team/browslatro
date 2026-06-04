// @vitest-environment node
import {
  SEEING_DOUBLE_X_MULT,
  applyHandLevelJokers,
  applyPerCardJokers,
  createSeeingDoubleJoker,
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

describe("Seeing Double", () => {
  test("multiplies xMult when scored hand has a club and a spade", () => {
    const result = applyHandLevelJokers([createSeeingDoubleJoker()], {
      scoredCards: [card("5", "clubs"), card("5", "spades")],
    });
    expect(result.xMult).toBe(SEEING_DOUBLE_X_MULT);
  });

  test("multiplies xMult when scored hand has a club and a heart", () => {
    const result = applyHandLevelJokers([createSeeingDoubleJoker()], {
      scoredCards: [card("5", "clubs"), card("5", "hearts")],
    });
    expect(result.xMult).toBe(SEEING_DOUBLE_X_MULT);
  });

  test("multiplies xMult when scored hand has a club and a diamond", () => {
    const result = applyHandLevelJokers([createSeeingDoubleJoker()], {
      scoredCards: [card("5", "clubs"), card("5", "diamonds")],
    });
    expect(result.xMult).toBe(SEEING_DOUBLE_X_MULT);
  });

  test("fires when both conditions are satisfied", () => {
    const result = applyHandLevelJokers([createSeeingDoubleJoker()], {
      scoredCards: [card("5", "clubs"), card("5", "hearts")],
    });
    expect(result.firedJokerIds).toEqual(["seeing-double"]);
  });

  test("does not fire on an all-clubs hand (negative)", () => {
    const result = applyHandLevelJokers([createSeeingDoubleJoker()], {
      scoredCards: [
        card("5", "clubs"),
        card("6", "clubs"),
        card("7", "clubs"),
      ],
    });
    expect(result.xMult).toBe(1);
  });

  test("does not fire on a hand with no clubs (negative)", () => {
    const result = applyHandLevelJokers([createSeeingDoubleJoker()], {
      scoredCards: [
        card("5", "spades"),
        card("5", "hearts"),
        card("5", "diamonds"),
      ],
    });
    expect(result.xMult).toBe(1);
  });

  test("does not fire when scoredCards is empty (negative)", () => {
    const result = applyHandLevelJokers([createSeeingDoubleJoker()], {
      scoredCards: [],
    });
    expect(result.xMult).toBe(1);
  });

  test("does not fire when scoredCards is missing from context (negative)", () => {
    const result = applyHandLevelJokers([createSeeingDoubleJoker()], {});
    expect(result.xMult).toBe(1);
  });

  test("does not contribute in the per-card pass", () => {
    const result = applyPerCardJokers([createSeeingDoubleJoker()], card());
    expect(result.firedJokerIds).toEqual([]);
  });

  test("is an uncommon joker", () => {
    expect(createSeeingDoubleJoker().rarity).toBe<JokerRarity>("uncommon");
  });
});
