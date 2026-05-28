// @vitest-environment node
import { applyNextShopModifiers } from "./nextShopMods";
import { BASE_REROLL_COST } from "../items/shop";

describe("applyNextShopModifiers", () => {
  test("an empty queue yields no reroll reduction (negative)", () => {
    expect(applyNextShopModifiers([]).rerollReduction).toBe(0);
  });

  test("a free-rerolls modifier reduces rerolls by the base reroll cost", () => {
    expect(applyNextShopModifiers([{ kind: "free-rerolls" }]).rerollReduction).toBe(
      BASE_REROLL_COST,
    );
  });

  test("stacked free-rerolls modifiers accumulate the reduction", () => {
    expect(
      applyNextShopModifiers([{ kind: "free-rerolls" }, { kind: "free-rerolls" }])
        .rerollReduction,
    ).toBe(BASE_REROLL_COST * 2);
  });

  test("a free-shop-items modifier marks the next shop's items free", () => {
    expect(applyNextShopModifiers([{ kind: "free-shop-items" }]).freeShopItems).toBe(true);
  });

  test("an empty queue leaves shop items paid (negative)", () => {
    expect(applyNextShopModifiers([]).freeShopItems).toBe(false);
  });

  test("a free-joker modifier collects its rarity", () => {
    expect(
      applyNextShopModifiers([{ kind: "free-joker", rarity: "uncommon" }]).freeJokerRarities,
    ).toEqual(["uncommon"]);
  });

  test("an empty queue requests no free jokers (negative)", () => {
    expect(applyNextShopModifiers([]).freeJokerRarities).toEqual([]);
  });
});
