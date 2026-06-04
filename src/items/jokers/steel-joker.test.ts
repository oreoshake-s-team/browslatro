// @vitest-environment node
import {
  STEEL_JOKER_X_MULT_PER_STEEL,
  applyHandLevelJokers,
  applyPerCardJokers,
  createSteelJoker,
} from "../jokers";
import type { JokerRarity } from "../jokers";
import type { Card, Enhancement, Rank, Suit } from "../../cards/types";

let nextId = 0;
function card(
  rank: Rank,
  suit: Suit = "spades",
  enhancement?: Enhancement,
): Card {
  return { id: ++nextId, rank, suit, ...(enhancement ? { enhancement } : {}) };
}

beforeEach(() => {
  nextId = 0;
});

describe("Steel Joker", () => {
  test("multiplies xMult by 1 + STEEL_JOKER_X_MULT_PER_STEEL × steel count", () => {
    const deck: Card[] = [
      card("5", "spades", "steel"),
      card("5", "hearts", "steel"),
      card("5", "diamonds", "steel"),
      card("2", "clubs"),
    ];
    const result = applyHandLevelJokers([createSteelJoker()], { fullDeck: deck });
    expect(result.xMult).toBe(1 + STEEL_JOKER_X_MULT_PER_STEEL * 3);
  });

  test("reports Steel Joker as fired when at least one Steel is in the deck", () => {
    const deck: Card[] = [card("5", "spades", "steel")];
    const result = applyHandLevelJokers([createSteelJoker()], { fullDeck: deck });
    expect(result.firedJokerIds).toEqual(["steel-joker"]);
  });

  test("does not multiply when the deck contains no Steel cards (negative)", () => {
    const deck: Card[] = [
      card("5", "spades"),
      card("K", "hearts", "gold"),
      card("Q", "clubs", "stone"),
    ];
    const result = applyHandLevelJokers([createSteelJoker()], { fullDeck: deck });
    expect(result.xMult).toBe(1);
  });

  test("does not fire when the deck contains no Steel cards (negative)", () => {
    const deck: Card[] = [card("5", "spades")];
    const result = applyHandLevelJokers([createSteelJoker()], { fullDeck: deck });
    expect(result.firedJokerIds).toEqual([]);
  });

  test("does not multiply when fullDeck is missing from context", () => {
    const result = applyHandLevelJokers([createSteelJoker()], {});
    expect(result.xMult).toBe(1);
  });

  test("does not multiply when fullDeck is empty", () => {
    const result = applyHandLevelJokers([createSteelJoker()], { fullDeck: [] });
    expect(result.xMult).toBe(1);
  });

  test("counts only Steel cards and ignores other enhancements", () => {
    const deck: Card[] = [
      card("5", "spades", "steel"),
      card("5", "hearts", "stone"),
      card("5", "clubs", "steel"),
      card("K", "diamonds", "gold"),
    ];
    const result = applyHandLevelJokers([createSteelJoker()], { fullDeck: deck });
    expect(result.xMult).toBe(1 + STEEL_JOKER_X_MULT_PER_STEEL * 2);
  });

  test("does not contribute in the per-card pass", () => {
    const result = applyPerCardJokers(
      [createSteelJoker()],
      card("5", "spades", "steel"),
    );
    expect(result.firedJokerIds).toEqual([]);
  });

  test("is an uncommon joker", () => {
    expect(createSteelJoker().rarity).toBe<JokerRarity>("uncommon");
  });
});
