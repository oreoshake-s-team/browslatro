// @vitest-environment node
import { describe, expect, test } from "vitest";
import { deepRunStart, parseDeepRunStarts } from "./deepRunStarts";
import { createJokerCatalog } from "../items/jokers";
import { createDefaultHandStats } from "../scoring/handStats";

function startLine(ante: number): string {
  return JSON.stringify({
    ante,
    jokers: [createJokerCatalog()[0]],
    handStats: createDefaultHandStats(),
  });
}

describe("parseDeepRunStarts", () => {
  test("parses one start per JSONL line", () => {
    const starts = parseDeepRunStarts(`${startLine(5)}\n${startLine(6)}\n`);
    expect(starts.map((s) => s.ante)).toEqual([5, 6]);
  });

  test("skips blank lines", () => {
    const starts = parseDeepRunStarts(`\n${startLine(5)}\n\n`);
    expect(starts).toHaveLength(1);
  });

  test("rejects a record without jokers", () => {
    const bad = JSON.stringify({ ante: 5, handStats: createDefaultHandStats() });
    expect(() => parseDeepRunStarts(bad)).toThrow(/jokers array/);
  });

  test("rejects an empty file", () => {
    expect(() => parseDeepRunStarts("\n\n")).toThrow(/no records/);
  });

  test("round-trips a full joker through JSON intact", () => {
    const joker = createJokerCatalog()[0];
    const starts = parseDeepRunStarts(startLine(5));
    expect(starts[0].jokers[0]).toEqual(joker);
  });
});

describe("deepRunStart", () => {
  test("cycles deterministically through the starts", () => {
    const starts = parseDeepRunStarts(`${startLine(5)}\n${startLine(6)}`);
    expect(deepRunStart(starts, 3).handStats).toEqual(starts[1].handStats);
  });

  test("returns the seeded-build shape used by the headless run seams", () => {
    const starts = parseDeepRunStarts(startLine(7));
    const build = deepRunStart(starts, 0);
    expect(Object.keys(build).sort()).toEqual(["handStats", "jokers"]);
  });
});
