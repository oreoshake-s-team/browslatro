// @vitest-environment node
/// <reference types="node" />
import { readdirSync, readFileSync } from "fs";
import { join, relative } from "path";
import { describe, expect, test } from "vitest";

const SRC = join(__dirname, "..");
const GREEDY_SYMBOLS = /\b(createGreedyAgent|greedyRanker|greedyRanking)\b/;

const ALLOWLIST = new Set([
  "ai/agents.ts",
  "ai/policy.ts",
  "hooks/useAutopilot.ts",
]);

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    if (!/\.tsx?$/.test(entry.name)) return [];
    if (/\.test\.tsx?$/.test(entry.name)) return [];
    return [full];
  });
}

describe("greedy algorithm usage is fenced", () => {
  test("the greedy ranker/agent is only referenced from the baseline/seam allowlist", () => {
    const offenders = sourceFiles(SRC)
      .filter((file) => GREEDY_SYMBOLS.test(readFileSync(file, "utf8")))
      .map((file) => relative(SRC, file).replace(/\\/g, "/"))
      .filter((rel) => !ALLOWLIST.has(rel))
      .sort();
    expect(
      offenders,
      "greedy is a benchmark/rollout/test-seam primitive — never a decision path or fallback; use the trained policy (sharedAdvisorRanker), which fails fast when unavailable. If this is intentional, add the file to ALLOWLIST in greedyUsage.guard.test.ts.",
    ).toEqual([]);
  });
});
