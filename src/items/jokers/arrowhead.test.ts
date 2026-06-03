// @vitest-environment node
import {
  ARROWHEAD_CHIPS,
  applyHandLevelJokers,
  applyPerCardJokers,
  createArrowheadJoker,
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

describe("Arrowhead", () => {
  test("adds ARROWHEAD_CHIPS when scored card is a Spade", () => {
    const result = applyPerCardJokers([createArrowheadJoker()], card("5", "spades"));
    expect(result.additiveChips).toBe(ARROWHEAD_CHIPS);
  });

  test("reports Arrowhead as fired on a Spade", () => {
    const result = applyPerCardJokers([createArrowheadJoker()], card("5", "spades"));
    expect(result.firedJokerIds).toEqual(["arrowhead"]);
  });

  test("does not add chips when scored card is a Heart", () => {
    const result = applyPerCardJokers([createArrowheadJoker()], card("5", "hearts"));
    expect(result.additiveChips).toBe(0);
  });

  test("does not add chips when scored card is a Diamond", () => {
    const result = applyPerCardJokers([createArrowheadJoker()], card("5", "diamonds"));
    expect(result.additiveChips).toBe(0);
  });

  test("does not add chips when scored card is a Club", () => {
    const result = applyPerCardJokers([createArrowheadJoker()], card("5", "clubs"));
    expect(result.additiveChips).toBe(0);
  });

  test("does not fire on a non-Spade card", () => {
    const result = applyPerCardJokers([createArrowheadJoker()], card("5", "hearts"));
    expect(result.firedJokerIds).toEqual([]);
  });

  test("does not contribute in the hand-level pass", () => {
    const result = applyHandLevelJokers([createArrowheadJoker()]);
    expect(result.firedJokerIds).toEqual([]);
  });

  test("is an uncommon joker", () => {
    expect(createArrowheadJoker().rarity).toBe<JokerRarity>("uncommon");
  });
});
