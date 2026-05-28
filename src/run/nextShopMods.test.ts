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
});
