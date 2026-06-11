import { describe, expect, test } from "vitest";
import { formatNumber } from "./formatNumber";

describe("formatNumber", () => {
  test("leaves values below a thousand unchanged", () => {
    expect(formatNumber(300)).toBe("300");
  });

  test("groups thousands with a comma", () => {
    expect(formatNumber(3240)).toBe("3,240");
  });

  test("groups millions with commas", () => {
    expect(formatNumber(1234567)).toBe("1,234,567");
  });

  test("preserves the sign for negative values", () => {
    expect(formatNumber(-1724)).toBe("-1,724");
  });

  test("does not add a separator at exactly three digits (negative)", () => {
    expect(formatNumber(999)).toBe("999");
  });

  test("formats zero without a separator", () => {
    expect(formatNumber(0)).toBe("0");
  });
});
