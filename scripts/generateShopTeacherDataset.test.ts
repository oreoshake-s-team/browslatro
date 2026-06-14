// @vitest-environment node
import { describe, expect, test, vi } from "vitest";
import { RUN_EVENT_SCHEMA_VERSION } from "../src/ai/runEvents";
import {
  generateShopTeacherDecisions,
  type ShopTeacherGeneratorStats,
} from "./generateShopTeacherDataset";
import type { ShopTeacherLabeler } from "./shopTeacher";

function parseLines(content: string): Record<string, unknown>[] {
  return content
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

const alwaysBuyFirst: ShopTeacherLabeler = async () => 0;

describe("generateShopTeacherDecisions", () => {
  test("produces schemaVersion-2 records from real headless runs", async () => {
    const content = await generateShopTeacherDecisions(
      { games: 4, seedOffset: 0, margin: 0.15 },
      alwaysBuyFirst,
    );
    const records = parseLines(content);
    expect(records.length).toBeGreaterThan(0);
    for (const r of records) {
      expect(r["schemaVersion"]).toBe(RUN_EVENT_SCHEMA_VERSION);
    }
  });

  test("a disabling margin never consults the teacher", async () => {
    const teacher = vi.fn<ShopTeacherLabeler>(async () => 0);
    await generateShopTeacherDecisions({ games: 4, seedOffset: 0, margin: -1 }, teacher);
    expect(teacher).not.toHaveBeenCalled();
  });

  test("a wide margin consults the teacher on contested shops", async () => {
    const teacher = vi.fn<ShopTeacherLabeler>(async () => 0);
    const stats: ShopTeacherGeneratorStats = { teacherCalls: 0 };
    await generateShopTeacherDecisions({ games: 6, seedOffset: 0, margin: 10 }, teacher, stats);
    expect(stats.teacherCalls).toBeGreaterThan(0);
  });

  test("teacher-chosen purchases are marked teacherLabeled", async () => {
    const content = await generateShopTeacherDecisions(
      { games: 6, seedOffset: 0, margin: 10 },
      alwaysBuyFirst,
    );
    const teacherPurchases = parseLines(content).filter(
      (r) => r["kind"] === "purchase" && r["teacherLabeled"] === true,
    );
    expect(teacherPurchases.length).toBeGreaterThan(0);
  });

  test("the labeled purchase item is one of its offers", async () => {
    const content = await generateShopTeacherDecisions(
      { games: 4, seedOffset: 0, margin: 10 },
      alwaysBuyFirst,
    );
    const purchases = parseLines(content).filter((r) => r["kind"] === "purchase");
    for (const r of purchases) {
      const item = r["item"] as Record<string, unknown>;
      const offers = r["offers"] as Array<Record<string, unknown>>;
      expect(offers.some((o) => o["id"] === item["id"])).toBe(true);
    }
  });
});
