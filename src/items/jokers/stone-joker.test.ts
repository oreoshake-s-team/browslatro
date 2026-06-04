// @vitest-environment node
import {
  STONE_JOKER_CHIPS_PER_STONE,
  applyHandLevelJokers,
  applyPerCardJokers,
  createStoneJoker,
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

describe("Stone Joker", () => {
  test("adds STONE_JOKER_CHIPS_PER_STONE per Stone card in the full deck", () => {
    const deck: Card[] = [
      card("5", "spades", "stone"),
      card("5", "hearts", "stone"),
      card("5", "diamonds", "stone"),
      card("2", "spades"),
    ];
    const result = applyHandLevelJokers([createStoneJoker()], { fullDeck: deck });
    expect(result.additiveChips).toBe(STONE_JOKER_CHIPS_PER_STONE * 3);
  });

  test("reports Stone Joker as fired when at least one Stone is in the deck", () => {
    const deck: Card[] = [card("5", "spades", "stone")];
    const result = applyHandLevelJokers([createStoneJoker()], { fullDeck: deck });
    expect(result.firedJokerIds).toEqual(["stone-joker"]);
  });

  test("adds no chips when the deck contains no Stone cards (negative)", () => {
    const deck: Card[] = [
      card("5", "spades"),
      card("K", "hearts", "gold"),
      card("2", "clubs", "bonus"),
    ];
    const result = applyHandLevelJokers([createStoneJoker()], { fullDeck: deck });
    expect(result.additiveChips).toBe(0);
  });

  test("does not fire when the deck contains no Stone cards (negative)", () => {
    const deck: Card[] = [card("K", "hearts", "gold")];
    const result = applyHandLevelJokers([createStoneJoker()], { fullDeck: deck });
    expect(result.firedJokerIds).toEqual([]);
  });

  test("adds no chips when fullDeck is missing from context", () => {
    const result = applyHandLevelJokers([createStoneJoker()], {});
    expect(result.additiveChips).toBe(0);
  });

  test("counts only Stone cards and ignores other enhancements in the same deck", () => {
    const deck: Card[] = [
      card("5", "spades", "stone"),
      card("5", "hearts", "steel"),
      card("5", "clubs", "stone"),
      card("K", "diamonds", "gold"),
    ];
    const result = applyHandLevelJokers([createStoneJoker()], { fullDeck: deck });
    expect(result.additiveChips).toBe(STONE_JOKER_CHIPS_PER_STONE * 2);
  });

  test("does not contribute in the per-card pass", () => {
    const result = applyPerCardJokers(
      [createStoneJoker()],
      card("5", "spades", "stone"),
    );
    expect(result.firedJokerIds).toEqual([]);
  });

  test("is a common joker", () => {
    expect(createStoneJoker().rarity).toBe<JokerRarity>("common");
  });
});
