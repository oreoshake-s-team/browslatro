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
  test("rejects a non-positive game count", async () => {
    await expect(generateDataset({ games: 0 })).rejects.toThrow(
      "games must be positive",
    );
  });

  test("produces one run result per game", async () => {
    const { runs } = await generateDataset(SMALL_CONFIG);
    expect(runs).toHaveLength(2);
  });

  test("records carry the schema version", async () => {
    const { records } = await generateDataset(SMALL_CONFIG);
    expect(records.every((r) => r.schemaVersion === DATASET_SCHEMA_VERSION)).toBe(
      true,
    );
  });

  test("records at least one decision per hand played", async () => {
    const { records, runs } = await generateDataset(SMALL_CONFIG);
    const handsPlayed = runs.reduce((sum, r) => sum + r.handsPlayed, 0);
    expect(records.length).toBeGreaterThanOrEqual(handsPlayed);
  });

  test("is deterministic for identical configs", { timeout: 30000 }, async () => {
    const first = await generateDataset(SMALL_CONFIG);
    const second = await generateDataset(SMALL_CONFIG);
    expect(JSON.stringify(first.records)).toBe(JSON.stringify(second.records));
  });

  test("chosenIndex points at the candidate matching the chosen action", async () => {
    const { records } = await generateDataset(SMALL_CONFIG);
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

  test("states round-trip through JSON", async () => {
    const { records } = await generateDataset(SMALL_CONFIG);
    expect(JSON.parse(JSON.stringify(records[0].state))).toEqual(
      records[0].state,
    );
  });

  test("threads the configured deck into the recorded state", async () => {
    const { records } = await generateDataset({
      ...SMALL_CONFIG,
      deck: "blue-deck",
    });
    expect(records.every((r) => r.state.deckId === "blue-deck")).toBe(true);
  });

  test("defaults the recorded deck to red when none is configured (negative)", async () => {
    const { records } = await generateDataset(SMALL_CONFIG);
    expect(records.every((r) => r.state.deckId === "red-deck")).toBe(true);
  });
});

describe("serializeDatasetRecords", () => {
  test("emits one parseable JSON line per record", async () => {
    const { records } = await generateDataset(SMALL_CONFIG);
    const lines = serializeDatasetRecords(records).split("\n");
    expect(lines.map((l) => JSON.parse(l))).toHaveLength(records.length);
  });

  test("serializes an empty dataset to an empty string", () => {
    expect(serializeDatasetRecords([])).toBe("");
  });
});
