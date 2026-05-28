import { beforeEach, describe, expect, test } from "vitest";
import { useShop } from "./shop";

describe("shop store", () => {
  beforeEach(() => {
    useShop.getState().resetShop();
  });

  test("starts with no shop offers", () => {
    expect(useShop.getState().shopOffers).toBeNull();
  });

  test("setShopOffers accepts a plain value", () => {
    useShop.getState().setShopOffers([]);
    expect(useShop.getState().shopOffers).toHaveLength(0);
  });

  test("setShopOffers accepts an updater function", () => {
    useShop.getState().setShopOffers([]);
    useShop.getState().setShopOffers((prev) => (prev === null ? prev : [...prev]));
    expect(useShop.getState().shopOffers).not.toBeNull();
  });

  test("resetShop clears offers back to null", () => {
    useShop.getState().setShopOffers([]);
    useShop.getState().resetShop();
    expect(useShop.getState().shopOffers).toBeNull();
  });
});
