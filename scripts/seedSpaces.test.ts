// @vitest-environment node
import { describe, expect, test } from "vitest";
import {
  BENCHMARK_SEED_BASE,
  assertBenchmarkSeedRange,
  assertTrainingSeedRange,
} from "./seedSpaces";

describe("assertTrainingSeedRange", () => {
  test("accepts a range fully below the benchmark base", () => {
    expect(() => assertTrainingSeedRange(0, 20_000)).not.toThrow();
  });

  test("accepts a range ending exactly at the last training seed", () => {
    expect(() =>
      assertTrainingSeedRange(BENCHMARK_SEED_BASE - 100, 100),
    ).not.toThrow();
  });

  test("rejects a range that crosses into the benchmark space", () => {
    expect(() =>
      assertTrainingSeedRange(BENCHMARK_SEED_BASE - 100, 101),
    ).toThrow(/benchmark seed space/);
  });

  test("rejects a range that starts inside the benchmark space", () => {
    expect(() => assertTrainingSeedRange(BENCHMARK_SEED_BASE, 1)).toThrow(
      /benchmark seed space/,
    );
  });

  test("rejects a negative seed offset", () => {
    expect(() => assertTrainingSeedRange(-1, 10)).toThrow(/non-negative/);
  });
});

describe("assertBenchmarkSeedRange", () => {
  test("accepts an offset at the benchmark base", () => {
    expect(() => assertBenchmarkSeedRange(BENCHMARK_SEED_BASE)).not.toThrow();
  });

  test("accepts an offset above the benchmark base", () => {
    expect(() =>
      assertBenchmarkSeedRange(BENCHMARK_SEED_BASE + 5000),
    ).not.toThrow();
  });

  test("rejects an offset inside the training space", () => {
    expect(() => assertBenchmarkSeedRange(5000)).toThrow(/training seed space/);
  });

  test("allows training seeds with the explicit escape hatch", () => {
    expect(() =>
      assertBenchmarkSeedRange(5000, { allowTrainingSeeds: true }),
    ).not.toThrow();
  });
});
