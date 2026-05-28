// @vitest-environment node
import { immediateMoneyGain } from "./immediateActions";
import { initialRunStats } from "./runStats";

describe("immediateMoneyGain (money-per-stat)", () => {
  test("multiplies the named stat by the per-unit amount", () => {
    const stats = { ...initialRunStats(), blindsSkipped: 3 };
    expect(
      immediateMoneyGain({ kind: "money-per-stat", stat: "blindsSkipped", perUnit: 5 }, stats),
    ).toBe(15);
  });

  test("reads the hands-played stat at $1 each", () => {
    const stats = { ...initialRunStats(), handsPlayed: 7 };
    expect(
      immediateMoneyGain({ kind: "money-per-stat", stat: "handsPlayed", perUnit: 1 }, stats),
    ).toBe(7);
  });

  test("yields $0 when the stat is zero (negative)", () => {
    expect(
      immediateMoneyGain(
        { kind: "money-per-stat", stat: "unusedDiscards", perUnit: 1 },
        initialRunStats(),
      ),
    ).toBe(0);
  });
});
