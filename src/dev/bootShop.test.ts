import {
  _resetBootShopForTests,
  bootIntoShop,
  shouldBootIntoShop,
} from "./bootShop";
import { useGame } from "../store/game";

function stubBootFlag(value: string | null) {
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) =>
        key === "browslatro:bootShop" ? value : null,
    },
  });
}

beforeEach(() => {
  useGame.getState().resetGame();
  _resetBootShopForTests();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("shouldBootIntoShop", () => {
  test("true when browslatro:bootShop is set to 1", () => {
    stubBootFlag("1");
    expect(shouldBootIntoShop()).toBe(true);
  });

  test("false when the flag is unset (negative)", () => {
    stubBootFlag(null);
    expect(shouldBootIntoShop()).toBe(false);
  });

  test("false for any value other than 1 (negative)", () => {
    stubBootFlag("true");
    expect(shouldBootIntoShop()).toBe(false);
  });

  test("false when window is unavailable", () => {
    expect(shouldBootIntoShop()).toBe(false);
  });
});

describe("bootIntoShop", () => {
  test("opens the post-round shop", () => {
    bootIntoShop();
    expect(useGame.getState().shopOffers).not.toBeNull();
  });

  test("dismisses the run-select screen", () => {
    bootIntoShop();
    expect(useGame.getState().pendingRunSelect).toBe(false);
  });

  test("dismisses the blind-select overlay", () => {
    bootIntoShop();
    expect(useGame.getState().pendingBlindSelect).toBe(false);
  });

  test("advances to the Big Blind", () => {
    bootIntoShop();
    expect(useGame.getState().blind).toBe(2);
  });

  test("leaves remainingHands untouched, matching a real round-1 win", () => {
    bootIntoShop();
    expect(useGame.getState().remainingHands).toBe(4);
  });

  test("wallet matches a played round-1 win: $4 start + $3 hands bonus + $3 reward + $0 interest", () => {
    bootIntoShop();
    expect(useGame.getState().money).toBe(10);
  });

  test("a second call is a no-op (negative)", () => {
    bootIntoShop();
    bootIntoShop();
    expect(useGame.getState().blind).toBe(2);
  });
});
