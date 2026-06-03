// @vitest-environment node
import {
  ROUGH_GEM_MONEY,
  applyHandLevelJokers,
  applyJokersToScoring,
  applyPerCardJokers,
  createRoughGemJoker,
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

describe("Rough Gem", () => {
  test("pays ROUGH_GEM_MONEY when scored card is a Diamond", () => {
    const result = applyPerCardJokers([createRoughGemJoker()], card("5", "diamonds"));
    expect(result.moneyEarned).toBe(ROUGH_GEM_MONEY);
  });

  test("reports Rough Gem as fired on a Diamond", () => {
    const result = applyPerCardJokers([createRoughGemJoker()], card("5", "diamonds"));
    expect(result.firedJokerIds).toEqual(["rough-gem"]);
  });

  test("does not pay when scored card is a Spade", () => {
    const result = applyPerCardJokers([createRoughGemJoker()], card("5", "spades"));
    expect(result.moneyEarned).toBe(0);
  });

  test("does not pay when scored card is a Heart", () => {
    const result = applyPerCardJokers([createRoughGemJoker()], card("5", "hearts"));
    expect(result.moneyEarned).toBe(0);
  });

  test("does not pay when scored card is a Club", () => {
    const result = applyPerCardJokers([createRoughGemJoker()], card("5", "clubs"));
    expect(result.moneyEarned).toBe(0);
  });

  test("does not fire on a non-Diamond card", () => {
    const result = applyPerCardJokers([createRoughGemJoker()], card("5", "spades"));
    expect(result.firedJokerIds).toEqual([]);
  });

  test("pays once per scored Diamond across a whole hand", () => {
    const result = applyJokersToScoring(
      [createRoughGemJoker()],
      [card("3", "diamonds"), card("K", "diamonds"), card("7", "spades")],
    );
    expect(result.moneyEarned).toBe(ROUGH_GEM_MONEY * 2);
  });

  test("does not contribute in the hand-level pass", () => {
    const result = applyHandLevelJokers([createRoughGemJoker()]);
    expect(result.firedJokerIds).toEqual([]);
  });

  test("is an uncommon joker", () => {
    expect(createRoughGemJoker().rarity).toBe<JokerRarity>("uncommon");
  });
});
