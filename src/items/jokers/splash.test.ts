// @vitest-environment node
import {
  allCardsScoreFromJokers,
  applyHandLevelJokers,
  applyPerCardJokers,
  createSplashJoker,
  createSmileyFaceJoker,
} from "../jokers";
import type { JokerRarity } from "../jokers";
import { getScoringCards } from "../../scoring/scoring";
import type { Card, Rank, Suit } from "../../cards/types";

let nextId = 0;
function card(rank: Rank = "5", suit: Suit = "spades"): Card {
  return { id: ++nextId, rank, suit };
}

beforeEach(() => {
  nextId = 0;
});

describe("Splash", () => {
  test("is an uncommon joker", () => {
    expect(createSplashJoker().rarity).toBe<JokerRarity>("uncommon");
  });

  test("does not contribute mult or chips on play", () => {
    const result = applyHandLevelJokers([createSplashJoker()], {
      scoredCards: [card()],
    });
    expect(result.additiveMult + result.additiveChips).toBe(0);
  });

  test("does not fire on its own per-card pass", () => {
    const result = applyPerCardJokers([createSplashJoker()], card());
    expect(result.firedJokerIds).toEqual([]);
  });
});

describe("allCardsScoreFromJokers", () => {
  test("returns false with no jokers", () => {
    expect(allCardsScoreFromJokers([])).toBe(false);
  });

  test("returns false without Splash (negative)", () => {
    expect(allCardsScoreFromJokers([createSmileyFaceJoker()])).toBe(false);
  });

  test("returns true with Splash equipped", () => {
    expect(allCardsScoreFromJokers([createSplashJoker()])).toBe(true);
  });
});

describe("getScoringCards — allCardsScore option (#721)", () => {
  test("Pair scoring without allCardsScore returns only the pair (regression)", () => {
    const pair1 = card("5", "spades");
    const pair2 = card("5", "hearts");
    const kicker = card("9", "diamonds");
    expect(
      getScoringCards([pair1, pair2, kicker], "Pair").map((c) => c.id),
    ).toEqual([pair1.id, pair2.id]);
  });

  test("Pair scoring with allCardsScore returns every played card", () => {
    const cards = [
      card("5", "spades"),
      card("5", "hearts"),
      card("9", "diamonds"),
      card("2", "clubs"),
      card("3", "spades"),
    ];
    expect(
      getScoringCards(cards, "Pair", { allCardsScore: true }).map((c) => c.id),
    ).toEqual(cards.map((c) => c.id));
  });

  test("High Card with allCardsScore returns every played card, not just the highest", () => {
    const cards = [card("5"), card("9"), card("2")];
    expect(
      getScoringCards(cards, "High Card", { allCardsScore: true }).length,
    ).toBe(3);
  });

  test("Empty input returns empty even with allCardsScore", () => {
    expect(getScoringCards([], "Pair", { allCardsScore: true })).toEqual([]);
  });
});
