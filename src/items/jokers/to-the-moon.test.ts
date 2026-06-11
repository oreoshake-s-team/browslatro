// @vitest-environment node
import {
  createJokerCatalog,
  createToTheMoonJoker,
  interestMultiplierFromJokers,
} from "../jokers";

describe("To the Moon", () => {
  test("is registered in the joker catalog", () => {
    const ids = createJokerCatalog().map((j) => j.id);
    expect(ids).toContain("to-the-moon");
  });

  test("one copy doubles the interest rate", () => {
    expect(interestMultiplierFromJokers([createToTheMoonJoker()])).toBe(2);
  });

  test("two copies triple the interest rate", () => {
    expect(
      interestMultiplierFromJokers([
        createToTheMoonJoker(),
        createToTheMoonJoker(),
      ]),
    ).toBe(3);
  });

  test("no copy leaves the rate unchanged (negative)", () => {
    expect(interestMultiplierFromJokers([])).toBe(1);
  });

  test("unrelated jokers do not change the rate (negative)", () => {
    expect(interestMultiplierFromJokers([createJokerCatalog()[0]])).toBe(1);
  });
});
