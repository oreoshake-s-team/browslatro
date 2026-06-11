// @vitest-environment node
import {
  availableJokers,
  createJokerCatalog,
  createSteelJoker,
  createStoneJoker,
  jokerEnhancementFilter,
} from "../jokers";
import type { Enhancement } from "../../cards/types";

function noEnhancements(): ReadonlySet<Enhancement> {
  return new Set<Enhancement>();
}

describe("availableJokers", () => {
  test("excludes Stone Joker while the deck holds no Stone card", () => {
    const pool = availableJokers(createJokerCatalog(), noEnhancements());
    expect(pool.some((j) => j.id === "stone-joker")).toBe(false);
  });

  test("excludes Steel Joker while the deck holds no Steel card", () => {
    const pool = availableJokers(createJokerCatalog(), noEnhancements());
    expect(pool.some((j) => j.id === "steel-joker")).toBe(false);
  });

  test("includes Stone Joker once a Stone card is in the deck", () => {
    const pool = availableJokers(
      createJokerCatalog(),
      new Set<Enhancement>(["stone"]),
    );
    expect(pool.some((j) => j.id === "stone-joker")).toBe(true);
  });

  test("includes Steel Joker once a Steel card is in the deck", () => {
    const pool = availableJokers(
      createJokerCatalog(),
      new Set<Enhancement>(["steel"]),
    );
    expect(pool.some((j) => j.id === "steel-joker")).toBe(true);
  });

  test("a Steel card alone does not unlock Stone Joker (negative)", () => {
    const pool = availableJokers(
      createJokerCatalog(),
      new Set<Enhancement>(["steel"]),
    );
    expect(pool.some((j) => j.id === "stone-joker")).toBe(false);
  });

  test("keeps every joker without an enhancement requirement", () => {
    const catalog = createJokerCatalog();
    const pool = availableJokers(catalog, noEnhancements());
    const ungated = catalog.filter(
      (j) => j.requiresEnhancementInDeck === undefined,
    );
    expect(pool.map((j) => j.id)).toEqual(ungated.map((j) => j.id));
  });

  test("Stone Joker requires a Stone card", () => {
    expect(createStoneJoker().requiresEnhancementInDeck).toBe("stone");
  });

  test("Steel Joker requires a Steel card", () => {
    expect(createSteelJoker().requiresEnhancementInDeck).toBe("steel");
  });

  test("every per-enhanced-in-deck joker declares a matching requirement", () => {
    for (const joker of createJokerCatalog()) {
      const enhancement = jokerEnhancementFilter(joker);
      if (enhancement === null) continue;
      expect(joker.requiresEnhancementInDeck).toBe(enhancement);
    }
  });
});
