import { beforeEach, describe, expect, test } from "vitest";
import { useEconomy, STARTING_MONEY } from "./economy";

describe("economy store", () => {
  beforeEach(() => {
    useEconomy.setState({ money: STARTING_MONEY });
  });

  test("starts with the starting wallet", () => {
    expect(useEconomy.getState().money).toBe(STARTING_MONEY);
  });

  test("earn adds to the wallet", () => {
    useEconomy.getState().earn(6);
    expect(useEconomy.getState().money).toBe(10);
  });

  test("spend deducts when affordable", () => {
    useEconomy.getState().spend(3);
    expect(useEconomy.getState().money).toBe(1);
  });

  test("spend reports success when affordable", () => {
    expect(useEconomy.getState().spend(4)).toBe(true);
  });

  test("spend leaves the wallet untouched when unaffordable", () => {
    useEconomy.getState().spend(5);
    expect(useEconomy.getState().money).toBe(STARTING_MONEY);
  });

  test("spend reports failure when unaffordable", () => {
    expect(useEconomy.getState().spend(5)).toBe(false);
  });

  test("setMoney clamps negative input to zero", () => {
    useEconomy.getState().setMoney(-3);
    expect(useEconomy.getState().money).toBe(0);
  });

  test("setMoney applies an absolute value", () => {
    useEconomy.getState().setMoney(12);
    expect(useEconomy.getState().money).toBe(12);
  });

  test("resetEconomy restores the starting wallet", () => {
    useEconomy.getState().earn(20);
    useEconomy.getState().resetEconomy();
    expect(useEconomy.getState().money).toBe(STARTING_MONEY);
  });
});
