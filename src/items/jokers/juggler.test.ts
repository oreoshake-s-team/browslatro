// @vitest-environment node
import {
  JUGGLER_HAND_SIZE_BONUS,
  applyHandLevelJokers,
  applyPerCardJokers,
  createBusinessCardJoker,
  createDrunkardJoker,
  createJugglerJoker,
  extraStartingHandSizeFromJokers,
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

describe("Juggler", () => {
  test("is a common joker", () => {
    expect(createJugglerJoker().rarity).toBe<JokerRarity>("common");
  });

  test("does not contribute additive chips or mult on play", () => {
    const result = applyHandLevelJokers([createJugglerJoker()], {
      scoredCards: [card()],
    });
    expect(result.additiveMult + result.additiveChips).toBe(0);
  });

  test("does not contribute in the per-card pass", () => {
    const result = applyPerCardJokers([createJugglerJoker()], card());
    expect(result.firedJokerIds).toEqual([]);
  });
});

describe("extraStartingHandSizeFromJokers", () => {
  test("returns 0 with no jokers", () => {
    expect(extraStartingHandSizeFromJokers([])).toBe(0);
  });

  test("returns 0 with no Juggler-like joker (negative)", () => {
    expect(
      extraStartingHandSizeFromJokers([
        createBusinessCardJoker(),
        createDrunkardJoker(),
      ]),
    ).toBe(0);
  });

  test("returns +1 with one Juggler", () => {
    expect(
      extraStartingHandSizeFromJokers([createJugglerJoker()]),
    ).toBe(JUGGLER_HAND_SIZE_BONUS);
  });

  test("stacks additively with two Jugglers", () => {
    expect(
      extraStartingHandSizeFromJokers([
        createJugglerJoker(),
        createJugglerJoker(),
      ]),
    ).toBe(JUGGLER_HAND_SIZE_BONUS * 2);
  });
});
