import { beforeEach, describe, expect, test } from "vitest";
import { useGame } from "./game";

describe("shop store", () => {
  beforeEach(() => {
    useGame.getState().resetShop();
  });

  test("starts with no shop offers", () => {
    expect(useGame.getState().shopOffers).toBeNull();
  });

  test("setShopOffers accepts a plain value", () => {
    useGame.getState().setShopOffers([]);
    expect(useGame.getState().shopOffers).toHaveLength(0);
  });

  test("setShopOffers accepts an updater function", () => {
    useGame.getState().setShopOffers([]);
    useGame.getState().setShopOffers((prev) => (prev === null ? prev : [...prev]));
    expect(useGame.getState().shopOffers).not.toBeNull();
  });

  test("resetShop clears offers back to null", () => {
    useGame.getState().setShopOffers([]);
    useGame.getState().resetShop();
    expect(useGame.getState().shopOffers).toBeNull();
  });
});
