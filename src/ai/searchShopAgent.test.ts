// @vitest-environment node
import { describe, expect, test } from "vitest";
import { searchChooser } from "./searchShopAgent";
import type { ShopActionChoiceInput } from "./headlessShopAgent";
import { EMPTY_SHOP_BUILD, SHOP_CONTEXT_FEATURES } from "./advisor/shopEncoding";
import type { StateEvaluator } from "./advisor/shopVisitSearch";
import type { ShopAdviceCandidate } from "./advisor/types";

function jokerBuy(cost: number): ShopAdviceCandidate {
  const attributes = new Array<number>(18).fill(0);
  attributes[14] = 0.25;
  return {
    action: "buy",
    item: { itemType: "joker", category: "joker-mult", attributes, id: "j", name: "J", description: "", cost },
  };
}

function input(candidates: ReadonlyArray<ShopAdviceCandidate>, money = 10): ShopActionChoiceInput {
  return { candidates, build: EMPTY_SHOP_BUILD, money, ante: 2, round: 5 };
}

function evaluatorOf(valueAt: (jokers: number, money: number) => number): StateEvaluator {
  return async (contexts, rows) => {
    const out = new Float32Array(rows);
    for (let row = 0; row < rows; row += 1) {
      const jokers = contexts[row * SHOP_CONTEXT_FEATURES + 17] * 5;
      const money = contexts[row * SHOP_CONTEXT_FEATURES] * 20;
      out[row] = valueAt(jokers, money);
    }
    return out;
  };
}

describe("searchChooser", () => {
  test("returns the search plan's first action", async () => {
    const choose = searchChooser(evaluatorOf((jokers, money) => jokers * 5 + money * 0.1));
    const index = await choose(input([jokerBuy(6), { action: "leave" }]));
    expect(index).toBe(0);
  });

  test("returns the leave candidate when the plan is to do nothing", async () => {
    const choose = searchChooser(evaluatorOf((_jokers, money) => money));
    const index = await choose(input([jokerBuy(6), { action: "leave" }]));
    expect(index).toBe(1);
  });

  test("fails loudly when there is no plan and no leave candidate", async () => {
    const choose = searchChooser(evaluatorOf((_jokers, money) => money));
    await expect(choose(input([jokerBuy(20)], 5))).rejects.toThrow(/no leave candidate/);
  });
});
