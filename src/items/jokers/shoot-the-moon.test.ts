// @vitest-environment node
import {
  SHOOT_THE_MOON_MULT,
  applyHandLevelJokers,
  applyPerCardJokers,
  createShootTheMoonJoker,
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

describe("Shoot the Moon joker", () => {
  test("adds SHOOT_THE_MOON_MULT mult per Queen held in hand", () => {
    const result = applyHandLevelJokers([createShootTheMoonJoker()], {
      heldInHandCards: [card("Q")],
    });
    expect(result.heldAdditiveMult).toBe(SHOOT_THE_MOON_MULT);
  });

  test("scales mult for multiple Queens held in hand", () => {
    const result = applyHandLevelJokers([createShootTheMoonJoker()], {
      heldInHandCards: [card("Q"), card("Q")],
    });
    expect(result.heldAdditiveMult).toBe(SHOOT_THE_MOON_MULT * 2);
  });

  test("adds no mult when no Queens are held", () => {
    const result = applyHandLevelJokers([createShootTheMoonJoker()], {
      heldInHandCards: [card("K"), card("3")],
    });
    expect(result.heldAdditiveMult).toBe(0);
  });

  test("does not fire when no Queens are held", () => {
    const result = applyHandLevelJokers([createShootTheMoonJoker()], {
      heldInHandCards: [card("K")],
    });
    expect(result.firedJokerIds).toEqual([]);
  });

  test("ignores Queens that were played rather than held", () => {
    const result = applyHandLevelJokers([createShootTheMoonJoker()], {
      scoredCards: [card("Q"), card("Q")],
      heldInHandCards: [],
    });
    expect(result.heldAdditiveMult).toBe(0);
  });

  test("does not contribute in the per-card pass", () => {
    const result = applyPerCardJokers([createShootTheMoonJoker()], card("Q"));
    expect(result.firedJokerIds).toEqual([]);
  });

  test("is a common joker", () => {
    expect(createShootTheMoonJoker().rarity).toBe<JokerRarity>("common");
  });
});
