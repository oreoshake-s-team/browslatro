// @vitest-environment node
import {
  SMILEY_FACE_MULT,
  applyHandLevelJokers,
  applyJokersToScoring,
  applyPerCardJokers,
  createBusinessCardJoker,
  createFacelessJoker,
  createPareidoliaJoker,
  createSmileyFaceJoker,
} from "../jokers";
import { applyOnDiscardJokers } from "../jokers";
import type { JokerRarity } from "../jokers";
import { allCardsAreFaceFromJokers, isFaceCardWith } from "./scoring/utils";
import type { Card, Rank, Suit } from "../../cards/types";

let nextId = 0;
function card(rank: Rank = "5", suit: Suit = "spades"): Card {
  return { id: ++nextId, rank, suit };
}

beforeEach(() => {
  nextId = 0;
});

describe("Pareidolia", () => {
  test("is an uncommon joker", () => {
    expect(createPareidoliaJoker().rarity).toBe<JokerRarity>("uncommon");
  });

  test("does not contribute mult or chips on play", () => {
    const result = applyHandLevelJokers([createPareidoliaJoker()], {
      scoredCards: [card()],
    });
    expect(result.additiveMult + result.additiveChips).toBe(0);
  });

  test("does not fire on its own per-card pass", () => {
    const result = applyPerCardJokers([createPareidoliaJoker()], card());
    expect(result.firedJokerIds).toEqual([]);
  });
});

describe("allCardsAreFaceFromJokers", () => {
  test("returns false with no jokers", () => {
    expect(allCardsAreFaceFromJokers([])).toBe(false);
  });

  test("returns false without Pareidolia (negative)", () => {
    expect(allCardsAreFaceFromJokers([createBusinessCardJoker()])).toBe(false);
  });

  test("returns true with Pareidolia equipped", () => {
    expect(allCardsAreFaceFromJokers([createPareidoliaJoker()])).toBe(true);
  });
});

describe("isFaceCardWith", () => {
  test("returns true for a King regardless of jokers", () => {
    expect(isFaceCardWith(card("K"), [])).toBe(true);
  });

  test("returns false for a 5 without Pareidolia", () => {
    expect(isFaceCardWith(card("5"), [])).toBe(false);
  });

  test("returns true for a 5 with Pareidolia", () => {
    expect(isFaceCardWith(card("5"), [createPareidoliaJoker()])).toBe(true);
  });
});

describe("Pareidolia + face-keying jokers", () => {
  test("Smiley Face fires on a non-face scored card when Pareidolia is equipped", () => {
    const result = applyJokersToScoring(
      [createPareidoliaJoker(), createSmileyFaceJoker()],
      [card("5", "spades")],
    );
    expect(result.additiveMult).toBe(SMILEY_FACE_MULT);
  });

  test("Smiley Face does not fire on a 5 without Pareidolia (negative)", () => {
    const result = applyJokersToScoring(
      [createSmileyFaceJoker()],
      [card("5", "spades")],
    );
    expect(result.additiveMult).toBe(0);
  });

  test("Faceless's discard-face count counts non-face cards as faces with Pareidolia", () => {
    const result = applyOnDiscardJokers(
      [createPareidoliaJoker(), createFacelessJoker()],
      [card("2"), card("3"), card("4")],
    );
    expect(result.moneyEarned).toBeGreaterThan(0);
  });

  test("Faceless's discard-face count does not fire on 2/3/4 without Pareidolia (negative)", () => {
    const result = applyOnDiscardJokers(
      [createFacelessJoker()],
      [card("2"), card("3"), card("4")],
    );
    expect(result.moneyEarned).toBe(0);
  });
});
