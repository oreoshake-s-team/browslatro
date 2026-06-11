// @vitest-environment node
import { describe, expect, test } from "vitest";
import { sliceJobs } from "./generateDataset";

describe("sliceJobs", () => {
  test("splits games evenly with no remainder", () => {
    const slices = sliceJobs(6, 0, 3);
    expect(slices.map((s) => s.games)).toEqual([2, 2, 2]);
  });

  test("distributes remainder across early jobs", () => {
    const slices = sliceJobs(10, 0, 3);
    expect(slices.map((s) => s.games)).toEqual([4, 3, 3]);
  });

  test("seed offsets are contiguous and non-overlapping", () => {
    const slices = sliceJobs(10, 5, 3);
    expect(slices.map((s) => s.seedOffset)).toEqual([5, 9, 12]);
  });

  test("total games across slices matches input", () => {
    const slices = sliceJobs(17, 0, 5);
    expect(slices.reduce((sum, j) => sum + j.games, 0)).toBe(17);
  });

  test("caps job count at total games", () => {
    expect(sliceJobs(2, 0, 10)).toHaveLength(2);
  });

  test("single job returns full range", () => {
    const slices = sliceJobs(100, 7, 1);
    expect(slices).toEqual([{ games: 100, seedOffset: 7 }]);
  });

  test("each slice starts where the previous ended", () => {
    const slices = sliceJobs(11, 0, 4);
    for (let i = 1; i < slices.length; i += 1) {
      expect(slices[i].seedOffset).toBe(slices[i - 1].seedOffset + slices[i - 1].games);
    }
  });
});
