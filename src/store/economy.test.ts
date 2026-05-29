import { beforeEach, describe, expect, test } from "vitest";
import { useGame } from "./game";
import { STARTING_MONEY } from "./economy";

describe("economy store", () => {
  beforeEach(() => {
    useGame.setState({ money: STARTING_MONEY });
  });

  test("starts with the starting wallet", () => {
    expect(useGame.getState().money).toBe(STARTING_MONEY);
  });

  test("earn adds to the wallet", () => {
    useGame.getState().earn(6);
    expect(useGame.getState().money).toBe(10);
  });

  test("spend deducts when affordable", () => {
    useGame.getState().spend(3);
    expect(useGame.getState().money).toBe(1);
  });

  test("spend reports success when affordable", () => {
    expect(useGame.getState().spend(4)).toBe(true);
  });

  test("spend leaves the wallet untouched when unaffordable", () => {
    useGame.getState().spend(5);
    expect(useGame.getState().money).toBe(STARTING_MONEY);
  });

  test("spend reports failure when unaffordable", () => {
    expect(useGame.getState().spend(5)).toBe(false);
  });

  test("setMoney clamps negative input to zero", () => {
    useGame.getState().setMoney(-3);
    expect(useGame.getState().money).toBe(0);
  });

  test("setMoney applies an absolute value", () => {
    useGame.getState().setMoney(12);
    expect(useGame.getState().money).toBe(12);
  });

  test("resetEconomy restores the starting wallet", () => {
    useGame.getState().earn(20);
    useGame.getState().resetEconomy();
    expect(useGame.getState().money).toBe(STARTING_MONEY);
  });
});
