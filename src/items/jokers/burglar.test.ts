// @vitest-environment node
import {
  BURGLAR_DISCARDS_OVERRIDE,
  BURGLAR_HANDS,
  applyHandLevelJokers,
  applyPerCardJokers,
  createBurglarJoker,
  createDrunkardJoker,
  discardsOverrideFromJokers,
  extraStartingDiscardsFromJokers,
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

describe("Burglar", () => {
  test("is an uncommon joker", () => {
    expect(createBurglarJoker().rarity).toBe<JokerRarity>("uncommon");
  });

  test("does not contribute mult or chips on play", () => {
    const result = applyHandLevelJokers([createBurglarJoker()], {
      scoredCards: [card()],
    });
    expect(result.additiveMult + result.additiveChips).toBe(0);
  });

  test("does not contribute in the per-card pass", () => {
    const result = applyPerCardJokers([createBurglarJoker()], card());
    expect(result.firedJokerIds).toEqual([]);
  });

  test("adds +BURGLAR_HANDS to starting hands", () => {
    expect(extraStartingHandsFromJokers([createBurglarJoker()])).toBe(
      BURGLAR_HANDS,
    );
  });
});

describe("discardsOverrideFromJokers", () => {
  test("returns null with no jokers", () => {
    expect(discardsOverrideFromJokers([])).toBeNull();
  });

  test("returns null with no override-providing jokers (negative)", () => {
    expect(discardsOverrideFromJokers([createDrunkardJoker()])).toBeNull();
  });

  test("returns the override when Burglar is equipped", () => {
    expect(discardsOverrideFromJokers([createBurglarJoker()])).toBe(
      BURGLAR_DISCARDS_OVERRIDE,
    );
  });

  test("returns 0 with multiple Burglars (idempotent)", () => {
    expect(
      discardsOverrideFromJokers([createBurglarJoker(), createBurglarJoker()]),
    ).toBe(BURGLAR_DISCARDS_OVERRIDE);
  });

  test("Burglar's discards field still sums normally for the helper that ignores override (negative — additive ignores override)", () => {
    expect(extraStartingDiscardsFromJokers([createBurglarJoker()])).toBe(0);
  });
});
