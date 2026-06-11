// @vitest-environment node
import {
  EGG_SELL_VALUE_PER_ROUND,
  applyHandLevelJokers,
  applyRoundEndToJokerStates,
  createEggJoker,
  createJokerCatalog,
  createSwashbucklerJoker,
  jokerSellValue,
} from "../jokers";
import type { Joker } from "../jokers";

function afterRounds(joker: Joker, rounds: number): Joker[] {
  let jokers: Joker[] = [joker];
  for (let i = 0; i < rounds; i += 1) {
    jokers = applyRoundEndToJokerStates(jokers, () => 0.99);
  }
  return jokers;
}

describe("Egg", () => {
  test("is registered in the joker catalog", () => {
    const ids = createJokerCatalog().map((j) => j.id);
    expect(ids).toContain("egg");
  });

  test("sells for the base value before any round ends", () => {
    expect(jokerSellValue(createEggJoker())).toBe(
      jokerSellValue(createJokerCatalog()[0]),
    );
  });

  test("gains sell value at the end of each round", () => {
    const [egg] = afterRounds(createEggJoker(), 1);
    expect(jokerSellValue(egg)).toBe(
      jokerSellValue(createEggJoker()) + EGG_SELL_VALUE_PER_ROUND,
    );
  });

  test("sell value keeps compounding over rounds", () => {
    const [egg] = afterRounds(createEggJoker(), 3);
    expect(jokerSellValue(egg)).toBe(
      jokerSellValue(createEggJoker()) + 3 * EGG_SELL_VALUE_PER_ROUND,
    );
  });

  test("has no scoring effect (negative)", () => {
    const result = applyHandLevelJokers([createEggJoker()], {
      playedHandLabel: "Pair",
    });
    expect(result.additiveMult + result.additiveChips).toBe(0);
  });

  test("a grown Egg feeds Swashbuckler's sell-value mult", () => {
    const [egg] = afterRounds(createEggJoker(), 2);
    const result = applyHandLevelJokers([egg, createSwashbucklerJoker()], {
      playedHandLabel: "Pair",
    });
    expect(result.additiveMult).toBe(jokerSellValue(egg));
  });
});
