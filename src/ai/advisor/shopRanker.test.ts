import { describe, expect, test } from "vitest";
import { SHOP_MODEL_URL, sharedShopRanker } from "./shopRanker";

describe("sharedShopRanker", () => {
  test("points at the committed model asset", () => {
    expect(SHOP_MODEL_URL).toBe("/models/advisor-shop-policy-v5.onnx");
  });

  test("exposes a ranker with load, rankShop, and rankPack", () => {
    const ranker = sharedShopRanker();
    expect(
      typeof ranker.load === "function" &&
        typeof ranker.rankShop === "function" &&
        typeof ranker.rankPack === "function",
    ).toBe(true);
  });

  test("memoizes the shared ranker across calls", () => {
    expect(sharedShopRanker()).toBe(sharedShopRanker());
  });
});
