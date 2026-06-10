// @vitest-environment node
import { describe, expect, test } from "vitest";
import {
  generateDataset,
  serializeDatasetRecords,
  DATASET_SCHEMA_VERSION,
} from "./dataset";

const SMALL_CONFIG = {
  games: 2,
  rollouts: 2,
  topN: 2,
  maxAnte: 1,
} as const;

describe("generateDataset", () => {
  test("rejects a non-positive game count", () => {
    expect(() => generateDataset({ games: 0 })).toThrow(
      "games must be positive",
    );
  });

  test("produces one run result per game", () => {
    expect(generateDataset(SMALL_CONFIG).runs).toHaveLength(2);
  });

  test("records carry the schema version", () => {
    const { records } = generateDataset(SMALL_CONFIG);
    expect(records.every((r) => r.schemaVersion === DATASET_SCHEMA_VERSION)).toBe(
      true,
    );
  });

  test("records at least one decision per hand played", () => {
    const { records, runs } = generateDataset(SMALL_CONFIG);
    const handsPlayed = runs.reduce((sum, r) => sum + r.handsPlayed, 0);
    expect(records.length).toBeGreaterThanOrEqual(handsPlayed);
  });

  test("is deterministic for identical configs", { timeout: 30000 }, () => {
    const first = generateDataset(SMALL_CONFIG);
    const second = generateDataset(SMALL_CONFIG);
    expect(JSON.stringify(first.records)).toBe(JSON.stringify(second.records));
  });

  test("chosenIndex points at the candidate matching the chosen action", () => {
    const { records } = generateDataset(SMALL_CONFIG);
    const matched = records.filter((r) => r.chosenIndex >= 0);
    expect(
      matched.every((r) => {
        const candidate = r.candidates[r.chosenIndex];
        return (
          candidate.action === r.chosenAction.kind &&
          candidate.cardIds.join(",") === r.chosenAction.cardIds.join(",")
        );
      }),
    ).toBe(true);
  });

  test("states round-trip through JSON", () => {
    const { records } = generateDataset(SMALL_CONFIG);
    expect(JSON.parse(JSON.stringify(records[0].state))).toEqual(
      records[0].state,
    );
  });
});

describe("serializeDatasetRecords", () => {
  test("emits one parseable JSON line per record", () => {
    const { records } = generateDataset(SMALL_CONFIG);
    const lines = serializeDatasetRecords(records).split("\n");
    expect(lines.map((l) => JSON.parse(l))).toHaveLength(records.length);
  });

  test("serializes an empty dataset to an empty string", () => {
    expect(serializeDatasetRecords([])).toBe("");
  });
});
