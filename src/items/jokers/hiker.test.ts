// @vitest-environment node
import {
  HIKER_CHIPS_PER_SCORED,
  chipsPerScoredCardFromJokers,
  createHikerJoker,
  createJokerCatalog,
} from "../jokers";
import { getCardChips } from "../../scoring/scoring";
import type { Card } from "../../cards/types";

const plainFive: Card = { id: 1, rank: "5", suit: "clubs" };

describe("Hiker (#980)", () => {
  test("is registered in the joker catalog", () => {
    const ids = createJokerCatalog().map((j) => j.id);
    expect(ids).toContain("hiker");
  });

  test("grants +5 chips per scored card", () => {
    expect(chipsPerScoredCardFromJokers([createHikerJoker()])).toBe(
      HIKER_CHIPS_PER_SCORED,
    );
  });

  test("two Hikers stack the per-card bonus", () => {
    expect(
      chipsPerScoredCardFromJokers([createHikerJoker(), createHikerJoker()]),
    ).toBe(2 * HIKER_CHIPS_PER_SCORED);
  });

  test("unrelated jokers grant nothing (negative)", () => {
    expect(chipsPerScoredCardFromJokers([createJokerCatalog()[0]])).toBe(0);
  });

  test("a card's bonus chips add to its scored chips", () => {
    const grown: Card = { ...plainFive, bonusChips: HIKER_CHIPS_PER_SCORED };
    expect(getCardChips(grown)).toBe(
      getCardChips(plainFive) + HIKER_CHIPS_PER_SCORED,
    );
  });

  test("a card without bonus chips scores its base chips (negative)", () => {
    expect(getCardChips(plainFive)).toBe(5);
  });
});
