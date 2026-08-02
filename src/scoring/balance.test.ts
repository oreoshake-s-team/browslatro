// @vitest-environment node
import { describe, expect, test } from "vitest";
import { balanceChipsAndMult } from "./balance";

describe("balanceChipsAndMult", () => {
  test("sets both values to the average", () => {
    expect(balanceChipsAndMult(100, 20)).toEqual({
      chips: 60,
      mult: 60,
      score: 3600,
    });
  });

  test("keeps the half-point average and floors only the product", () => {
    expect(balanceChipsAndMult(10, 5)).toEqual({
      chips: 7.5,
      mult: 7.5,
      score: 56,
    });
  });

  test("zero on both sides stays zero (negative)", () => {
    expect(balanceChipsAndMult(0, 0).score).toBe(0);
  });
});
