// @vitest-environment node
import { describe, expect, test } from "vitest";
import {
  diffRenderProfiling,
  summarizeRenderProfiling,
  type RenderProfilingRecord,
} from "./summarizeRenderProfiling";

function record(
  id: string,
  phase: "mount" | "update",
  actualDuration: number,
): RenderProfilingRecord {
  return { id, phase, actualDuration, baseDuration: actualDuration, startTime: 0, commitTime: 0 };
}

describe("summarizeRenderProfiling", () => {
  test("aggregates render count and total duration per id", () => {
    const records = [
      record("Sidebar", "mount", 1),
      record("Sidebar", "update", 2),
      record("SidebarFooter", "mount", 0.5),
    ];
    expect(summarizeRenderProfiling(records)).toEqual([
      { id: "Sidebar", renders: 2, mounts: 1, updates: 1, totalActualDurationMs: 3 },
      { id: "SidebarFooter", renders: 1, mounts: 1, updates: 0, totalActualDurationMs: 0.5 },
    ]);
  });

  test("sorts rows by total actual duration descending", () => {
    const records = [record("Small", "mount", 1), record("Big", "mount", 5)];
    expect(summarizeRenderProfiling(records).map((row) => row.id)).toEqual([
      "Big",
      "Small",
    ]);
  });
});

describe("diffRenderProfiling", () => {
  test("pairs matching ids and reports before/after render counts", () => {
    const before = summarizeRenderProfiling([
      record("SidebarFooter", "mount", 1),
      record("SidebarFooter", "update", 1),
    ]);
    const after = summarizeRenderProfiling([record("SidebarFooter", "mount", 1)]);
    expect(diffRenderProfiling(before, after)).toEqual([
      {
        id: "SidebarFooter",
        rendersBefore: 2,
        rendersAfter: 1,
        totalMsBefore: 2,
        totalMsAfter: 1,
      },
    ]);
  });

  test("includes an id present in only one of the two runs", () => {
    const before = summarizeRenderProfiling([record("OnlyBefore", "mount", 1)]);
    const after = summarizeRenderProfiling([record("OnlyAfter", "mount", 1)]);
    const diff = diffRenderProfiling(before, after);
    expect(diff.map((row) => row.id).sort()).toEqual(["OnlyAfter", "OnlyBefore"]);
  });
});
