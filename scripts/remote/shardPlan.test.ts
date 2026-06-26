// @vitest-environment node
import { describe, expect, test } from "vitest";
import { planShards } from "./shardPlan";

describe("planShards", () => {
  test("produces one shard per machine", () => {
    const shards = planShards({ runId: "run1", totalGames: 100, machines: 4 });
    expect(shards).toHaveLength(4);
  });

  test("distributes games to match the total", () => {
    const shards = planShards({ runId: "run1", totalGames: 101, machines: 4 });
    expect(shards.reduce((sum, s) => sum + s.games, 0)).toBe(101);
  });

  test("seed offsets are contiguous and non-overlapping", () => {
    const shards = planShards({ runId: "run1", totalGames: 10, machines: 3, seedOffset: 5 });
    expect(shards.map((s) => s.seedOffset)).toEqual([5, 9, 12]);
  });

  test("derives deterministic object keys from runId and index", () => {
    const shards = planShards({ runId: "run1", totalGames: 4, machines: 2 });
    expect(shards.map((s) => s.outputKey)).toEqual([
      "datasets/run1/shard-0.jsonl",
      "datasets/run1/shard-1.jsonl",
    ]);
  });

  test("honors a custom key prefix", () => {
    const shards = planShards({ runId: "run1", totalGames: 2, machines: 1, keyPrefix: "nightly" });
    expect(shards[0].outputKey).toBe("nightly/run1/shard-0.jsonl");
  });

  test("caps shard count at total games", () => {
    expect(planShards({ runId: "run1", totalGames: 2, machines: 8 })).toHaveLength(2);
  });

  test("rejects a runId that is not key-safe", () => {
    expect(() => planShards({ runId: "bad/id", totalGames: 1, machines: 1 })).toThrow(/key-safe|safe object-key/);
  });

  test("rejects non-positive totalGames", () => {
    expect(() => planShards({ runId: "run1", totalGames: 0, machines: 1 })).toThrow(/positive integer/);
  });

  test("rejects non-positive machines", () => {
    expect(() => planShards({ runId: "run1", totalGames: 4, machines: 0 })).toThrow(/positive integer/);
  });
});
