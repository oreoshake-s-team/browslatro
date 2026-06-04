// @vitest-environment node
import {
  TRIBOULET_X_MULT,
  applyHandLevelJokers,
  applyJokersToScoring,
  applyPerCardJokers,
  createLegendaryJokerCatalog,
  createTribouletJoker,
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

describe("Triboulet", () => {
  test("multiplies xMult by TRIBOULET_X_MULT on a scored King", () => {
    const result = applyPerCardJokers([createTribouletJoker()], card("K"));
    expect(result.xMult).toBe(TRIBOULET_X_MULT);
  });

  test("multiplies xMult by TRIBOULET_X_MULT on a scored Queen", () => {
    const result = applyPerCardJokers([createTribouletJoker()], card("Q"));
    expect(result.xMult).toBe(TRIBOULET_X_MULT);
  });

  test("reports Triboulet as fired on a scored King", () => {
    const result = applyPerCardJokers([createTribouletJoker()], card("K"));
    expect(result.firedJokerIds).toEqual(["triboulet"]);
  });

  test("does not multiply on a scored Jack (non-K/Q face)", () => {
    const result = applyPerCardJokers([createTribouletJoker()], card("J"));
    expect(result.xMult).toBe(1);
  });

  test("does not multiply on a scored Ace", () => {
    const result = applyPerCardJokers([createTribouletJoker()], card("A"));
    expect(result.xMult).toBe(1);
  });

  test("does not multiply on a scored low rank", () => {
    const result = applyPerCardJokers([createTribouletJoker()], card("2"));
    expect(result.xMult).toBe(1);
  });

  test("does not fire on a non-K/Q card", () => {
    const result = applyPerCardJokers([createTribouletJoker()], card("J"));
    expect(result.firedJokerIds).toEqual([]);
  });

  test("compounds xMult across multiple scored Ks and Qs in a hand", () => {
    const result = applyJokersToScoring(
      [createTribouletJoker()],
      [card("K"), card("Q"), card("K"), card("3")],
    );
    expect(result.xMult).toBe(TRIBOULET_X_MULT ** 3);
  });

  test("does not contribute in the hand-level pass", () => {
    const result = applyHandLevelJokers([createTribouletJoker()]);
    expect(result.firedJokerIds).toEqual([]);
  });

  test("appears in the legendary joker catalog", () => {
    const ids = createLegendaryJokerCatalog().map((j) => j.id);
    expect(ids).toContain("triboulet");
  });

  test("is a legendary joker", () => {
    expect(createTribouletJoker().rarity).toBe<JokerRarity>("legendary");
  });
});
