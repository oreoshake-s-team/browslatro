// @vitest-environment node
import {
  BASEBALL_CARD_X_MULT_PER_UNCOMMON,
  applyHandLevelJokers,
  applyPerCardJokers,
  createBaseballCardJoker,
  createFibonacciJoker,
  createPlusFourMultJoker,
  createSteelJoker,
  createTradingCardJoker,
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

const FACTOR_PER_UNCOMMON = 1 + BASEBALL_CARD_X_MULT_PER_UNCOMMON;

describe("Baseball Card", () => {
  test("xMult is 1 when no other uncommon jokers are equipped (negative)", () => {
    const result = applyHandLevelJokers(
      [createBaseballCardJoker(), createPlusFourMultJoker()],
      {},
    );
    expect(result.xMult).toBe(1);
  });

  test("multiplies xMult by (1+amount) for one other uncommon joker", () => {
    const result = applyHandLevelJokers(
      [createBaseballCardJoker(), createTradingCardJoker()],
      {},
    );
    expect(result.xMult).toBe(FACTOR_PER_UNCOMMON);
  });

  test("compounds when two other uncommon jokers are equipped", () => {
    const result = applyHandLevelJokers(
      [
        createBaseballCardJoker(),
        createTradingCardJoker(),
        createFibonacciJoker(),
      ],
      {},
    );
    expect(result.xMult).toBeCloseTo(Math.pow(FACTOR_PER_UNCOMMON, 2));
  });

  test("does not count itself as an uncommon (negative)", () => {
    const result = applyHandLevelJokers([createBaseballCardJoker()], {});
    expect(result.xMult).toBe(1);
  });

  test("does not double-count Steel Joker's own xMult contribution unrelated to rarity counting", () => {
    const result = applyHandLevelJokers(
      [createBaseballCardJoker(), createSteelJoker()],
      {},
    );
    expect(result.xMult).toBe(FACTOR_PER_UNCOMMON);
  });

  test("fires when at least one other uncommon joker is present", () => {
    const result = applyHandLevelJokers(
      [createBaseballCardJoker(), createTradingCardJoker()],
      {},
    );
    expect(result.firedJokerIds).toContain("baseball-card");
  });

  test("does not contribute in the per-card pass", () => {
    const result = applyPerCardJokers([createBaseballCardJoker()], card());
    expect(result.firedJokerIds).toEqual([]);
  });

  test("is a rare joker", () => {
    expect(createBaseballCardJoker().rarity).toBe<JokerRarity>("rare");
  });
});
