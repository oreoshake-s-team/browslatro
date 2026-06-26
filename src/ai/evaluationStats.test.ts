import { describe, expect, test } from "vitest";
import {
  lossHistogram,
  percentile,
  summarize,
  winRateStandardError,
} from "./evaluationStats";

describe("summarize", () => {
  test("returns all-zero stats for an empty sample", () => {
    expect(summarize([])).toEqual({
      mean: 0,
      min: 0,
      max: 0,
      median: 0,
      p25: 0,
      p75: 0,
      stdDev: 0,
    });
  });

  test("computes the mean", () => {
    expect(summarize([2, 4, 6]).mean).toBe(4);
  });

  test("reports the minimum", () => {
    expect(summarize([5, 1, 9]).min).toBe(1);
  });

  test("reports the maximum", () => {
    expect(summarize([5, 1, 9]).max).toBe(9);
  });

  test("computes the median of an odd-length sample", () => {
    expect(summarize([3, 1, 2]).median).toBe(2);
  });

  test("interpolates the median of an even-length sample", () => {
    expect(summarize([1, 2, 3, 4]).median).toBe(2.5);
  });

  test("computes the population standard deviation", () => {
    expect(summarize([2, 4, 6]).stdDev).toBeCloseTo(1.632993);
  });
});

describe("percentile", () => {
  test("returns 0 for an empty sample", () => {
    expect(percentile([], 0.5)).toBe(0);
  });

  test("interpolates the 25th percentile", () => {
    expect(percentile([1, 2, 3, 4, 5], 0.25)).toBe(2);
  });
});

describe("winRateStandardError", () => {
  test("returns 0 when no games were played", () => {
    expect(winRateStandardError(0, 0)).toBe(0);
  });

  test("computes the binomial standard error", () => {
    expect(winRateStandardError(25, 100)).toBeCloseTo(0.043301);
  });
});

describe("lossHistogram", () => {
  test("counts losses per ante", () => {
    expect(lossHistogram([1, 2, 2, 3])).toEqual([
      { ante: 1, count: 1 },
      { ante: 2, count: 2 },
      { ante: 3, count: 1 },
    ]);
  });

  test("returns an empty histogram for no losses", () => {
    expect(lossHistogram([])).toEqual([]);
  });
});
