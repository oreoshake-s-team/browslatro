// @vitest-environment node
import {
  ONYX_AGATE_MULT,
  applyHandLevelJokers,
  applyPerCardJokers,
  createOnyxAgateJoker,
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

describe("Onyx Agate", () => {
  test("adds ONYX_AGATE_MULT when scored card is a Club", () => {
    const result = applyPerCardJokers([createOnyxAgateJoker()], card("5", "clubs"));
    expect(result.additiveMult).toBe(ONYX_AGATE_MULT);
  });

  test("reports Onyx Agate as fired on a Club", () => {
    const result = applyPerCardJokers([createOnyxAgateJoker()], card("5", "clubs"));
    expect(result.firedJokerIds).toEqual(["onyx-agate"]);
  });

  test("does not add mult when scored card is a Spade", () => {
    const result = applyPerCardJokers([createOnyxAgateJoker()], card("5", "spades"));
    expect(result.additiveMult).toBe(0);
  });

  test("does not add mult when scored card is a Heart", () => {
    const result = applyPerCardJokers([createOnyxAgateJoker()], card("5", "hearts"));
    expect(result.additiveMult).toBe(0);
  });

  test("does not add mult when scored card is a Diamond", () => {
    const result = applyPerCardJokers([createOnyxAgateJoker()], card("5", "diamonds"));
    expect(result.additiveMult).toBe(0);
  });

  test("does not fire on a non-Club card", () => {
    const result = applyPerCardJokers([createOnyxAgateJoker()], card("5", "spades"));
    expect(result.firedJokerIds).toEqual([]);
  });

  test("does not contribute in the hand-level pass", () => {
    const result = applyHandLevelJokers([createOnyxAgateJoker()]);
    expect(result.firedJokerIds).toEqual([]);
  });

  test("is an uncommon joker", () => {
    expect(createOnyxAgateJoker().rarity).toBe<JokerRarity>("uncommon");
  });
});
