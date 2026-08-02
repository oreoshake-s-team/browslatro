import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export interface RenderProfilingRecord {
  readonly id: string;
  readonly phase: string;
  readonly actualDuration: number;
  readonly baseDuration: number;
  readonly startTime: number;
  readonly commitTime: number;
}

export interface RenderProfilingSummaryRow {
  readonly id: string;
  readonly renders: number;
  readonly mounts: number;
  readonly updates: number;
  readonly totalActualDurationMs: number;
}

export function summarizeRenderProfiling(
  records: ReadonlyArray<RenderProfilingRecord>,
): ReadonlyArray<RenderProfilingSummaryRow> {
  const byId = new Map<
    string,
    { renders: number; mounts: number; updates: number; total: number }
  >();
  for (const record of records) {
    const entry = byId.get(record.id) ?? {
      renders: 0,
      mounts: 0,
      updates: 0,
      total: 0,
    };
    entry.renders += 1;
    entry.total += record.actualDuration;
    if (record.phase === "mount") entry.mounts += 1;
    else entry.updates += 1;
    byId.set(record.id, entry);
  }
  return Array.from(byId.entries())
    .map(([id, v]) => ({
      id,
      renders: v.renders,
      mounts: v.mounts,
      updates: v.updates,
      totalActualDurationMs: Math.round(v.total * 100) / 100,
    }))
    .sort((a, b) => b.totalActualDurationMs - a.totalActualDurationMs);
}

export interface RenderProfilingDiffRow {
  readonly id: string;
  readonly rendersBefore: number;
  readonly rendersAfter: number;
  readonly totalMsBefore: number;
  readonly totalMsAfter: number;
}

export function diffRenderProfiling(
  before: ReadonlyArray<RenderProfilingSummaryRow>,
  after: ReadonlyArray<RenderProfilingSummaryRow>,
): ReadonlyArray<RenderProfilingDiffRow> {
  const beforeById = new Map(before.map((row) => [row.id, row]));
  const afterById = new Map(after.map((row) => [row.id, row]));
  const ids = new Set([...beforeById.keys(), ...afterById.keys()]);
  return Array.from(ids)
    .map((id) => {
      const b = beforeById.get(id);
      const a = afterById.get(id);
      return {
        id,
        rendersBefore: b?.renders ?? 0,
        rendersAfter: a?.renders ?? 0,
        totalMsBefore: b?.totalActualDurationMs ?? 0,
        totalMsAfter: a?.totalActualDurationMs ?? 0,
      };
    })
    .sort(
      (x, y) =>
        y.totalMsBefore - y.totalMsAfter - (x.totalMsBefore - x.totalMsAfter),
    );
}

function loadRecords(path: string): ReadonlyArray<RenderProfilingRecord> {
  return JSON.parse(readFileSync(path, "utf8")) as ReadonlyArray<RenderProfilingRecord>;
}

const __filename = fileURLToPath(import.meta.url);
const isMain = !!process.argv[1] && resolve(process.argv[1]) === __filename;

if (isMain) {
  const [, , beforePath, afterPath] = process.argv;
  if (beforePath === undefined) {
    console.error(
      "Usage: yarn dlx tsx scripts/summarizeRenderProfiling.ts <run.json> [afterRun.json]",
    );
    process.exit(1);
  }
  const before = summarizeRenderProfiling(loadRecords(beforePath));
  if (afterPath === undefined) {
    console.table(before);
  } else {
    const after = summarizeRenderProfiling(loadRecords(afterPath));
    console.table(diffRenderProfiling(before, after));
  }
}
