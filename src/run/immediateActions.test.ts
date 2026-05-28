// @vitest-environment node
import { immediateMoneyGain } from "./immediateActions";
import { initialRunStats } from "./runStats";

describe("immediateMoneyGain (money-per-stat)", () => {
  test("multiplies the named stat by the per-unit amount", () => {
    const stats = { ...initialRunStats(), blindsSkipped: 3 };
    expect(
      immediateMoneyGain(
        { kind: "money-per-stat", stat: "blindsSkipped", perUnit: 5 },
        { stats, money: 0 },
      ),
    ).toBe(15);
  });

  test("reads the hands-played stat at $1 each", () => {
    const stats = { ...initialRunStats(), handsPlayed: 7 };
    expect(
      immediateMoneyGain(
        { kind: "money-per-stat", stat: "handsPlayed", perUnit: 1 },
        { stats, money: 0 },
      ),
    ).toBe(7);
  });

  test("yields $0 when the stat is zero (negative)", () => {
    expect(
      immediateMoneyGain(
        { kind: "money-per-stat", stat: "unusedDiscards", perUnit: 1 },
        { stats: initialRunStats(), money: 0 },
      ),
    ).toBe(0);
  });
});

describe("immediateMoneyGain (double-money)", () => {
  test("doubles the current money when under the cap", () => {
    expect(
      immediateMoneyGain(
        { kind: "double-money", cap: 40 },
        { stats: initialRunStats(), money: 12 },
      ),
    ).toBe(12);
  });

  test("clamps the gain at the cap", () => {
    expect(
      immediateMoneyGain(
        { kind: "double-money", cap: 40 },
        { stats: initialRunStats(), money: 100 },
      ),
    ).toBe(40);
  });

  test("yields $0 when the player has no money (negative)", () => {
    expect(
      immediateMoneyGain(
        { kind: "double-money", cap: 40 },
        { stats: initialRunStats(), money: 0 },
      ),
    ).toBe(0);
  });
});
