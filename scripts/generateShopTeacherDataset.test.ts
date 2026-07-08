// @vitest-environment node
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test, vi } from "vitest";
import { RUN_EVENT_SCHEMA_VERSION } from "../src/ai/runEvents";
import type { HeadlessAgent } from "../src/ai/headlessRun";
import {
  buildRolloutConfig,
  checkpointPath,
  generateShopTeacherDecisions,
  readCheckpoint,
  writeCheckpoint,
  type ShopTeacherGeneratorStats,
} from "./generateShopTeacherDataset";
import type { ShopTeacherLabeler } from "./shopTeacher";

const TIMEOUT_MS = 60000;

function parseLines(content: string): Record<string, unknown>[] {
  return content
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

describe("generateShopTeacherDecisions", () => {
  test(
    "a wide margin labels contested shops via the teacher and records valid run events",
    async () => {
      const teacher = vi.fn<ShopTeacherLabeler>(async () => 0);
      const stats: ShopTeacherGeneratorStats = { teacherCalls: 0 };
      const content = await generateShopTeacherDecisions(
        { games: 6, seedOffset: 0, margin: 10 },
        teacher,
        stats,
      );
      const records = parseLines(content);
      const purchases = records.filter((r) => r["kind"] === "purchase");

      expect(records.length).toBeGreaterThan(0);
      expect(records.every((r) => r["schemaVersion"] === RUN_EVENT_SCHEMA_VERSION)).toBe(true);
      expect(stats.teacherCalls).toBeGreaterThan(0);
      expect(purchases.some((r) => r["teacherLabeled"] === true)).toBe(true);
      expect(
        purchases.every((r) => {
          const item = r["item"] as Record<string, unknown>;
          const offers = r["offers"] as Array<Record<string, unknown>>;
          return offers.some((o) => o["id"] === item["id"]);
        }),
      ).toBe(true);
    },
    TIMEOUT_MS,
  );

  test(
    "a disabling margin never consults the teacher",
    async () => {
      const teacher = vi.fn<ShopTeacherLabeler>(async () => 0);
      await generateShopTeacherDecisions({ games: 4, seedOffset: 0, margin: -1 }, teacher);
      expect(teacher).not.toHaveBeenCalled();
    },
    TIMEOUT_MS,
  );

  test("the candidate-value rollout scores with the resolved hand agent, not a hardcoded greedy agent", () => {
    const customAgent: HeadlessAgent = {
      name: "custom",
      chooseAction: async () => ({ kind: "skip" }),
    };
    expect(buildRolloutConfig(customAgent).agent).toBe(customAgent);
  });

  test(
    "reports progress once per completed game",
    async () => {
      const teacher = vi.fn<ShopTeacherLabeler>(async () => 0);
      const progress: number[] = [];
      await generateShopTeacherDecisions(
        { games: 3, seedOffset: 0, margin: -1 },
        teacher,
        undefined,
        (n) => progress.push(n),
      );
      expect(progress).toEqual([1, 2, 3]);
    },
    TIMEOUT_MS,
  );

  test(
    "resumeFromGame skips already-completed games",
    async () => {
      const teacher = vi.fn<ShopTeacherLabeler>(async () => 0);
      const progress: number[] = [];
      await generateShopTeacherDecisions(
        { games: 5, seedOffset: 0, margin: -1, resumeFromGame: 3 },
        teacher,
        undefined,
        (n) => progress.push(n),
      );
      expect(progress).toEqual([4, 5]);
    },
    TIMEOUT_MS,
  );

  test(
    "reports each completed game's records via onGameRecords as they happen, not just at the end",
    async () => {
      const teacher = vi.fn<ShopTeacherLabeler>(async () => 0);
      const perGame: Array<{ gamesDone: number; count: number }> = [];
      const content = await generateShopTeacherDecisions(
        { games: 6, seedOffset: 0, margin: 10 },
        teacher,
        { teacherCalls: 0 },
        undefined,
        undefined,
        (records, gamesDone) => perGame.push({ gamesDone, count: records.length }),
      );
      expect(perGame.map((g) => g.gamesDone)).toEqual([1, 2, 3, 4, 5, 6]);
      const totalFromCallbacks = perGame.reduce((sum, g) => sum + g.count, 0);
      expect(totalFromCallbacks).toBe(parseLines(content).length);
    },
    TIMEOUT_MS,
  );
});

describe("shop teacher checkpoint", () => {
  test("round-trips through writeCheckpoint/readCheckpoint", () => {
    const dir = mkdtempSync(join(tmpdir(), "shop-teacher-checkpoint-"));
    const outPath = join(dir, "out.jsonl");
    expect(readCheckpoint(outPath)).toBeNull();

    writeCheckpoint(outPath, {
      schemaVersion: 1,
      gamesDone: 4,
      teacherCalls: 7,
      recordsWritten: 9,
    });

    expect(readCheckpoint(outPath)).toEqual({
      schemaVersion: 1,
      gamesDone: 4,
      teacherCalls: 7,
      recordsWritten: 9,
    });
    expect(checkpointPath(outPath)).toBe(`${outPath}.progress.json`);
  });
});
