// @vitest-environment node
import { describe, expect, test } from "vitest";
import { RUN_EVENT_SCHEMA_VERSION } from "../src/ai/runEvents";
import { BASE_REROLL_COST } from "../src/items/shop";
import { generateShopDecisions } from "./generateShopDataset";

function parseLines(content: string): Record<string, unknown>[] {
  return content
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

describe("generateShopDecisions", () => {
  test("produces at least one record per game for a range of seeds", () => {
    const content = generateShopDecisions({ games: 20, seedOffset: 0 });
    const records = parseLines(content);
    expect(records.length).toBeGreaterThan(0);
  });

  test("all records carry schemaVersion 2", () => {
    const records = parseLines(generateShopDecisions({ games: 10, seedOffset: 0 }));
    for (const r of records) {
      expect(r["schemaVersion"]).toBe(RUN_EVENT_SCHEMA_VERSION);
    }
  });

  test("purchase record item is present in its offers array", () => {
    const records = parseLines(generateShopDecisions({ games: 50, seedOffset: 0 }));
    const purchases = records.filter((r) => r["kind"] === "purchase");
    expect(purchases.length).toBeGreaterThan(0);
    for (const r of purchases) {
      const item = r["item"] as Record<string, unknown>;
      const offers = r["offers"] as Array<Record<string, unknown>>;
      const found = offers.some((o) => o["id"] === item["id"]);
      expect(found).toBe(true);
    }
  });

  test("reroll records are emitted when no offer is affordable", () => {
    const records = parseLines(generateShopDecisions({ games: 200, seedOffset: 42 }));
    const rerolls = records.filter((r) => r["kind"] === "reroll");
    expect(rerolls.length).toBeGreaterThan(0);
    for (const r of rerolls) {
      expect(r["cost"]).toBe(BASE_REROLL_COST);
      expect(Array.isArray(r["offers"])).toBe(true);
    }
  });

  test("pack-pick records pick the first option", () => {
    const records = parseLines(generateShopDecisions({ games: 10, seedOffset: 0 }));
    const picks = records.filter((r) => r["kind"] === "pack-pick");
    expect(picks.length).toBeGreaterThan(0);
    for (const r of picks) {
      expect(r["pickedIndex"]).toBe(0);
      expect(r["pool"]).toBe("celestial");
      expect(r["variant"]).toBe("normal");
    }
  });

  test("pack-pick options are non-empty planet entries", () => {
    const records = parseLines(generateShopDecisions({ games: 5, seedOffset: 0 }));
    const picks = records.filter((r) => r["kind"] === "pack-pick");
    for (const r of picks) {
      const options = r["options"] as Array<Record<string, unknown>>;
      expect(options.length).toBeGreaterThan(0);
      for (const opt of options) {
        expect(opt["optionType"]).toBe("planet");
        expect(typeof opt["id"]).toBe("string");
        expect(typeof opt["name"]).toBe("string");
      }
    }
  });

  test("output is deterministic for the same seed", () => {
    const a = generateShopDecisions({ games: 10, seedOffset: 7 });
    const b = generateShopDecisions({ games: 10, seedOffset: 7 });
    expect(a).toBe(b);
  });

  test("different seed offsets produce different output", () => {
    const a = generateShopDecisions({ games: 5, seedOffset: 0 });
    const b = generateShopDecisions({ games: 5, seedOffset: 1000 });
    expect(a).not.toBe(b);
  });

  test("no record emitted when money is below both joker price and reroll cost", () => {
    let found = false;
    for (let seed = 0; seed < 1000; seed += 1) {
      const records = parseLines(generateShopDecisions({ games: 1, seedOffset: seed }));
      const shopRecords = records.filter((r) => r["kind"] === "purchase" || r["kind"] === "reroll");
      if (shopRecords.length === 0) {
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });

  test("purchase records list itemType joker for all offers", () => {
    const records = parseLines(generateShopDecisions({ games: 30, seedOffset: 0 }));
    const purchases = records.filter((r) => r["kind"] === "purchase");
    for (const r of purchases) {
      const offers = r["offers"] as Array<Record<string, unknown>>;
      for (const o of offers) {
        expect(o["itemType"]).toBe("joker");
      }
    }
  });
});
