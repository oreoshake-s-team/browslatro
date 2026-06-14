// @vitest-environment node
import {
  BARON_X_MULT,
  applyHandLevelJokers,
  applyPerCardJokers,
  createBaronJoker,
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

describe("Baron joker", () => {
  test("multiplies heldXMult by BARON_X_MULT per King held in hand", () => {
    const result = applyHandLevelJokers([createBaronJoker()], {
      heldInHandCards: [card("K")],
    });
    expect(result.heldXMult).toBe(BARON_X_MULT);
  });

  test("compounds heldXMult for multiple Kings held in hand", () => {
    const result = applyHandLevelJokers([createBaronJoker()], {
      heldInHandCards: [card("K"), card("K")],
    });
    expect(result.heldXMult).toBe(BARON_X_MULT * BARON_X_MULT);
  });

  test("contributes nothing to the joker-phase xMult", () => {
    const result = applyHandLevelJokers([createBaronJoker()], {
      heldInHandCards: [card("K")],
    });
    expect(result.xMult).toBe(1);
  });

  test("leaves heldXMult unchanged when no Kings are held", () => {
    const result = applyHandLevelJokers([createBaronJoker()], {
      heldInHandCards: [card("Q"), card("10")],
    });
    expect(result.heldXMult).toBe(1);
  });

  test("does not fire when no Kings are held", () => {
    const result = applyHandLevelJokers([createBaronJoker()], {
      heldInHandCards: [card("Q")],
    });
    expect(result.firedJokerIds).toEqual([]);
  });

  test("ignores Kings that were played rather than held", () => {
    const result = applyHandLevelJokers([createBaronJoker()], {
      scoredCards: [card("K"), card("K")],
      heldInHandCards: [],
    });
    expect(result.xMult).toBe(1);
  });

  test("does not contribute in the per-card pass", () => {
    const result = applyPerCardJokers([createBaronJoker()], card("K"));
    expect(result.firedJokerIds).toEqual([]);
  });

  test("is a rare joker", () => {
    expect(createBaronJoker().rarity).toBe<JokerRarity>("rare");
  });
});
