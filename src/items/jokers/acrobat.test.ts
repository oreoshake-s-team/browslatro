// @vitest-environment node
import {
  ACROBAT_X_MULT,
  applyHandLevelJokers,
  applyPerCardJokers,
  createAcrobatJoker,
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

describe("Acrobat", () => {
  test("multiplies xMult by ACROBAT_X_MULT when this is the final hand of the round", () => {
    const result = applyHandLevelJokers([createAcrobatJoker()], {
      remainingHands: 1,
    });
    expect(result.xMult).toBe(ACROBAT_X_MULT);
  });

  test("reports Acrobat as fired on the final hand", () => {
    const result = applyHandLevelJokers([createAcrobatJoker()], {
      remainingHands: 1,
    });
    expect(result.firedJokerIds).toEqual(["acrobat"]);
  });

  test("does not multiply when more than one hand remains", () => {
    const result = applyHandLevelJokers([createAcrobatJoker()], {
      remainingHands: 2,
    });
    expect(result.xMult).toBe(1);
  });

  test("does not fire when more than one hand remains", () => {
    const result = applyHandLevelJokers([createAcrobatJoker()], {
      remainingHands: 2,
    });
    expect(result.firedJokerIds).toEqual([]);
  });

  test("does not multiply when remainingHands is 0", () => {
    const result = applyHandLevelJokers([createAcrobatJoker()], {
      remainingHands: 0,
    });
    expect(result.xMult).toBe(1);
  });

  test("does not multiply when remainingHands is missing from context", () => {
    const result = applyHandLevelJokers([createAcrobatJoker()], {});
    expect(result.xMult).toBe(1);
  });

  test("does not contribute in the per-card pass", () => {
    const result = applyPerCardJokers([createAcrobatJoker()], card("K"));
    expect(result.firedJokerIds).toEqual([]);
  });

  test("is an uncommon joker", () => {
    expect(createAcrobatJoker().rarity).toBe<JokerRarity>("uncommon");
  });
});
