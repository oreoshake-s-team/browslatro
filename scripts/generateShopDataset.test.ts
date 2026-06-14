// @vitest-environment node
import { describe, expect, test } from "vitest";
import { RUN_EVENT_SCHEMA_VERSION } from "../src/ai/runEvents";
import { generateShopDecisions } from "./generateShopDataset";

function parseLines(content: string): Record<string, unknown>[] {
  return content
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

describe("generateShopDecisions", () => {
  test("produces records from real headless runs", async () => {
    const records = parseLines(await generateShopDecisions({ games: 3, seedOffset: 0 }));
    expect(records.length).toBeGreaterThan(0);
  });

  test("all records carry schemaVersion 2", async () => {
    const records = parseLines(await generateShopDecisions({ games: 3, seedOffset: 0 }));
    for (const r of records) {
      expect(r["schemaVersion"]).toBe(RUN_EVENT_SCHEMA_VERSION);
    }
  });

  test("the labeled purchase item is one of its offers", async () => {
    const records = parseLines(await generateShopDecisions({ games: 4, seedOffset: 0 }));
    const purchases = records.filter((r) => r["kind"] === "purchase");
    for (const r of purchases) {
      const item = r["item"] as Record<string, unknown>;
      const offers = r["offers"] as Array<Record<string, unknown>>;
      expect(offers.some((o) => o["id"] === item["id"])).toBe(true);
    }
  });

  test("purchase offers are jokers or planets", async () => {
    const records = parseLines(await generateShopDecisions({ games: 4, seedOffset: 0 }));
    const purchases = records.filter((r) => r["kind"] === "purchase");
    for (const r of purchases) {
      const offers = r["offers"] as Array<Record<string, unknown>>;
      for (const o of offers) {
        expect(["joker", "planet"]).toContain(o["itemType"]);
      }
    }
  });

  test("pack-pick records pick a valid planet option or skip", async () => {
    const records = parseLines(await generateShopDecisions({ games: 4, seedOffset: 0 }));
    const picks = records.filter((r) => r["kind"] === "pack-pick");
    expect(picks.length).toBeGreaterThan(0);
    for (const r of picks) {
      const options = r["options"] as Array<Record<string, unknown>>;
      const picked = r["pickedIndex"];
      expect(r["pool"]).toBe("celestial");
      const valid =
        picked === null ||
        (typeof picked === "number" && picked >= 0 && picked < options.length);
      expect(valid).toBe(true);
    }
  });

  test("pack-pick options are non-empty planet entries", async () => {
    const records = parseLines(await generateShopDecisions({ games: 3, seedOffset: 0 }));
    const picks = records.filter((r) => r["kind"] === "pack-pick");
    for (const r of picks) {
      const options = r["options"] as Array<Record<string, unknown>>;
      expect(options.length).toBeGreaterThan(0);
      for (const opt of options) {
        expect(opt["optionType"]).toBe("planet");
      }
    }
  });

  test("output is deterministic for the same seed", async () => {
    const a = await generateShopDecisions({ games: 2, seedOffset: 7 });
    const b = await generateShopDecisions({ games: 2, seedOffset: 7 });
    expect(a).toBe(b);
  });

  test("different seed offsets produce different output", async () => {
    const a = await generateShopDecisions({ games: 2, seedOffset: 0 });
    const b = await generateShopDecisions({ games: 2, seedOffset: 500 });
    expect(a).not.toBe(b);
  });

  test("no reroll records are emitted by the rollout labeler", async () => {
    const records = parseLines(await generateShopDecisions({ games: 4, seedOffset: 0 }));
    expect(records.some((r) => r["kind"] === "reroll")).toBe(false);
  });
});
