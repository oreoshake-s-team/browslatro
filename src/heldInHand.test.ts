import {
  countHeldEnhancement,
  getHeldInHand,
  STEEL_MULT_FACTOR,
  steelHeldMultiplier,
} from "./heldInHand";
import type { Card, Enhancement } from "./types";

function card(id: number, enhancement?: Enhancement): Card {
  return enhancement
    ? { id, rank: "5", suit: "spades", enhancement }
    : { id, rank: "5", suit: "spades" };
}

describe("getHeldInHand", () => {
  test("returns every card not in the submitted set", () => {
    expect(getHeldInHand([card(1), card(2), card(3)], new Set([2]))).toEqual([
      card(1),
      card(3),
    ]);
  });

  test("returns an empty array when every card was submitted", () => {
    expect(getHeldInHand([card(1), card(2)], new Set([1, 2]))).toEqual([]);
  });

  test("returns the full hand when nothing was submitted", () => {
    expect(getHeldInHand([card(1), card(2)], new Set())).toHaveLength(2);
  });
});

describe("countHeldEnhancement", () => {
  test("counts only cards with the requested enhancement", () => {
    const hand = [card(1, "gold"), card(2, "steel"), card(3, "gold")];
    expect(countHeldEnhancement(hand, new Set(), "gold")).toBe(2);
  });

  test("excludes submitted cards from the count", () => {
    const hand = [card(1, "steel"), card(2, "steel")];
    expect(countHeldEnhancement(hand, new Set([1]), "steel")).toBe(1);
  });

  test("returns 0 when no card carries the enhancement", () => {
    expect(countHeldEnhancement([card(1, "gold")], new Set(), "steel")).toBe(0);
  });
});

describe("steelHeldMultiplier", () => {
  test("returns 1 when no Steel cards are held", () => {
    expect(steelHeldMultiplier([card(1), card(2, "gold")], new Set())).toBe(1);
  });

  test("returns STEEL_MULT_FACTOR for a single held Steel", () => {
    expect(steelHeldMultiplier([card(1, "steel")], new Set())).toBe(
      STEEL_MULT_FACTOR,
    );
  });

  test("stacks multiplicatively across multiple held Steel cards", () => {
    const hand = [card(1, "steel"), card(2, "steel")];
    expect(steelHeldMultiplier(hand, new Set())).toBe(STEEL_MULT_FACTOR ** 2);
  });

  test("excludes Steel cards that were played in the submitted hand", () => {
    const hand = [card(1, "steel"), card(2, "steel")];
    expect(steelHeldMultiplier(hand, new Set([1]))).toBe(STEEL_MULT_FACTOR);
  });

  test("returns 1 when every Steel card was submitted (negative)", () => {
    const hand = [card(1, "steel"), card(2, "steel")];
    expect(steelHeldMultiplier(hand, new Set([1, 2]))).toBe(1);
  });
});
