// @vitest-environment node
import {
  DRUNKARD_DISCARDS_BONUS,
  applyHandLevelJokers,
  applyPerCardJokers,
  createBusinessCardJoker,
  createDrunkardJoker,
  createJugglerJoker,
  extraStartingDiscardsFromJokers,
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

describe("Drunkard", () => {
  test("is a common joker", () => {
    expect(createDrunkardJoker().rarity).toBe<JokerRarity>("common");
  });

  test("does not contribute additive chips or mult on play", () => {
    const result = applyHandLevelJokers([createDrunkardJoker()], {
      scoredCards: [card()],
    });
    expect(result.additiveMult + result.additiveChips).toBe(0);
  });

  test("does not contribute in the per-card pass", () => {
    const result = applyPerCardJokers([createDrunkardJoker()], card());
    expect(result.firedJokerIds).toEqual([]);
  });
});

describe("extraStartingDiscardsFromJokers", () => {
  test("returns 0 with no jokers", () => {
    expect(extraStartingDiscardsFromJokers([])).toBe(0);
  });

  test("returns 0 with no Drunkard-like joker (negative)", () => {
    expect(
      extraStartingDiscardsFromJokers([
        createBusinessCardJoker(),
        createJugglerJoker(),
      ]),
    ).toBe(0);
  });

  test("returns +1 with one Drunkard", () => {
    expect(
      extraStartingDiscardsFromJokers([createDrunkardJoker()]),
    ).toBe(DRUNKARD_DISCARDS_BONUS);
  });

  test("stacks additively with two Drunkards", () => {
    expect(
      extraStartingDiscardsFromJokers([
        createDrunkardJoker(),
        createDrunkardJoker(),
      ]),
    ).toBe(DRUNKARD_DISCARDS_BONUS * 2);
  });
});
