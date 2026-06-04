// @vitest-environment node
import {
  CREDIT_CARD_DEBT_FLOOR,
  applyHandLevelJokers,
  applyPerCardJokers,
  createCreditCardJoker,
  extraDebtFloorFromJokers,
  extraStartingDiscardsFromJokers,
  extraStartingHandSizeFromJokers,
  extraStartingHandsFromJokers,
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

describe("Credit Card", () => {
  test("is a common joker", () => {
    expect(createCreditCardJoker().rarity).toBe<JokerRarity>("common");
  });

  test("does not contribute mult or chips on play", () => {
    const result = applyHandLevelJokers([createCreditCardJoker()], {
      scoredCards: [card()],
    });
    expect(result.additiveMult + result.additiveChips).toBe(0);
  });

  test("does not contribute in the per-card pass", () => {
    const result = applyPerCardJokers([createCreditCardJoker()], card());
    expect(result.firedJokerIds).toEqual([]);
  });

  test("does not change starting hand size", () => {
    expect(extraStartingHandSizeFromJokers([createCreditCardJoker()])).toBe(0);
  });

  test("does not change starting hands or discards", () => {
    const j = [createCreditCardJoker()];
    expect(
      extraStartingHandsFromJokers(j) + extraStartingDiscardsFromJokers(j),
    ).toBe(0);
  });
});

describe("extraDebtFloorFromJokers", () => {
  test("returns 0 with no jokers", () => {
    expect(extraDebtFloorFromJokers([])).toBe(0);
  });

  test("returns +CREDIT_CARD_DEBT_FLOOR with one Credit Card", () => {
    expect(
      extraDebtFloorFromJokers([createCreditCardJoker()]),
    ).toBe(CREDIT_CARD_DEBT_FLOOR);
  });

  test("stacks additively with two Credit Cards", () => {
    expect(
      extraDebtFloorFromJokers([
        createCreditCardJoker(),
        createCreditCardJoker(),
      ]),
    ).toBe(CREDIT_CARD_DEBT_FLOOR * 2);
  });
});
