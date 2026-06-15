// @vitest-environment node
import { describe, expect, test, vi } from "vitest";
import { RUN_EVENT_SCHEMA_VERSION } from "../src/ai/runEvents";
import {
  generateShopTeacherDecisions,
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
});
