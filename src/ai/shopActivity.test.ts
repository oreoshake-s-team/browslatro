import { describe, expect, test } from "vitest";
import {
  averageShopActivity,
  emptyShopActivity,
  mergeShopActivity,
  type ShopActivity,
} from "./shopActivity";

const sample: ShopActivity = {
  rerolls: 1,
  jokersBought: 2,
  consumablesBought: 3,
  vouchersBought: 4,
  jokersSold: 8,
  packsOpened: 5,
  packPicks: 6,
  moneySpent: 7,
};

describe("emptyShopActivity", () => {
  test("starts every counter at zero", () => {
    expect(emptyShopActivity()).toEqual({
      rerolls: 0,
      jokersBought: 0,
      consumablesBought: 0,
      vouchersBought: 0,
      jokersSold: 0,
      packsOpened: 0,
      packPicks: 0,
      moneySpent: 0,
    });
  });
});

describe("mergeShopActivity", () => {
  test("adds each counter pairwise", () => {
    expect(mergeShopActivity(sample, sample)).toEqual({
      rerolls: 2,
      jokersBought: 4,
      consumablesBought: 6,
      vouchersBought: 8,
      jokersSold: 16,
      packsOpened: 10,
      packPicks: 12,
      moneySpent: 14,
    });
  });
});

describe("averageShopActivity", () => {
  test("returns empty activity for an empty list", () => {
    expect(averageShopActivity([])).toEqual(emptyShopActivity());
  });

  test("divides each total by the sample size", () => {
    expect(averageShopActivity([sample, emptyShopActivity()])).toEqual({
      rerolls: 0.5,
      jokersBought: 1,
      consumablesBought: 1.5,
      vouchersBought: 2,
      jokersSold: 4,
      packsOpened: 2.5,
      packPicks: 3,
      moneySpent: 3.5,
    });
  });
});
