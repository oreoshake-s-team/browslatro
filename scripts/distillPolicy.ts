import "dotenv/config";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { serializeDatasetRecords } from "../src/ai/dataset";
import {
  createRequestAdviceTeacher,
  labelDisagreements,
  parseDatasetRecords,
  type TeacherLabeler,
} from "./labelDisagreements";
import { BENCHMARK_SEED_BASE } from "./seedSpaces";

export interface DistillConfig {
  readonly base: string;
  readonly model: string;
  readonly teacherOut: string;
  readonly candidateOut: string;
  readonly teacherWeight: number;
  readonly minScoreFraction: number;
  readonly epochs: number;
  readonly games: number;
  readonly seedOffset: number;
  readonly limit: number;
  readonly concurrency: number;
  readonly python: string;
}

export function localBestPlayTeacher(): TeacherLabeler {
  return async (_state, candidates) => {
    let best = 0;
    let bestScore = -Infinity;
    candidates.forEach((candidate, index) => {
      const score = candidate.action === "play" ? candidate.score : -1;
      if (score > bestScore) {
        bestScore = score;
        best = index;
      }
    });
    return best;
  };
}

export function trainArgs(config: DistillConfig): ReadonlyArray<string> {
  return [
    "ml/train.py",
    config.base,
    "--teacher",
    config.teacherOut,
    "--teacher-weight",
    String(config.teacherWeight),
    "--epochs",
    String(config.epochs),
    "--out",
    config.candidateOut,
  ];
}

export function benchmarkArgs(config: DistillConfig): ReadonlyArray<string> {
  return [
    "scripts/benchmarkPolicy.ts",
    config.model,
    config.candidateOut,
    "--games",
    String(config.games),
    "--seed-offset",
    String(config.seedOffset),
  ];
}

export function parseAvgBlinds(stdout: string, label: string): number | null {
  for (const line of stdout.split("\n")) {
    if (!line.includes(label)) continue;
    const numbers = line
      .trim()
      .split(/\s+/)
      .map(Number)
      .filter((value) => !Number.isNaN(value));
    if (numbers.length >= 3) {
      return numbers[2];
    }
  }
  return null;
}

export interface ShipVerdict {
  readonly baselineBlinds: number;
  readonly candidateBlinds: number;
  readonly delta: number;
  readonly ship: boolean;
}

export function shipVerdict(
  baselineBlinds: number,
  candidateBlinds: number,
): ShipVerdict {
  const delta = candidateBlinds - baselineBlinds;
  return { baselineBlinds, candidateBlinds, delta, ship: delta > 0 };
}

export function formatVerdict(
  verdict: ShipVerdict,
  baselineLabel: string,
  candidateLabel: string,
): string {
  const sign = verdict.delta >= 0 ? "+" : "";
  return (
    `${baselineLabel}: ${verdict.baselineBlinds.toFixed(2)} avgBlinds → ` +
    `${candidateLabel}: ${verdict.candidateBlinds.toFixed(2)} ` +
    `(${sign}${verdict.delta.toFixed(2)}, ${verdict.ship ? "SHIP" : "HOLD"})`
  );
}

function numberFlag(name: string, fallback: number): number {
  const index = process.argv.indexOf(name);
  if (index === -1 || index + 1 >= process.argv.length) return fallback;
  const value = Number.parseFloat(process.argv[index + 1]);
  if (Number.isNaN(value)) throw new Error(`${name} expects a number`);
  return value;
}

function stringFlag(name: string, fallback: string): string {
  const index = process.argv.indexOf(name);
  if (index === -1 || index + 1 >= process.argv.length) return fallback;
  return process.argv[index + 1];
}

async function main(): Promise<void> {
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const base = stringFlag("--base", "");
  const model = stringFlag("--model", "");
  if (base === "" || model === "") {
    console.error(
      "Usage: yarn dlx tsx scripts/distillPolicy.ts --base <dataset.jsonl> --model <current.onnx> " +
        "[--out <candidate.onnx>] [--teacher-out <labels.jsonl>] [--teacher-weight 5] " +
        "[--min-score-fraction 0.25] [--limit N] [--concurrency 1] [--epochs 30] [--games 200] " +
        "[--seed-offset N] [--python python3] [--dry-run]",
    );
    process.exit(1);
  }
  const dryRun = process.argv.includes("--dry-run");
  const config: DistillConfig = {
    base,
    model,
    teacherOut: stringFlag("--teacher-out", "ml/teacher-labels.jsonl"),
    candidateOut: stringFlag("--out", "ml/candidate.onnx"),
    teacherWeight: numberFlag("--teacher-weight", 5),
    minScoreFraction: numberFlag("--min-score-fraction", 0.25),
    epochs: numberFlag("--epochs", 30),
    games: numberFlag("--games", 200),
    seedOffset: numberFlag("--seed-offset", BENCHMARK_SEED_BASE),
    limit: numberFlag("--limit", 0),
    concurrency: numberFlag("--concurrency", 1),
    python: stringFlag("--python", "python3"),
  };

  let teacher: TeacherLabeler;
  if (dryRun) {
    console.log("DRY RUN: labeling with the local best-play teacher (no API spend)");
    teacher = localBestPlayTeacher();
  } else {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey === undefined || apiKey === "") {
      console.error("ANTHROPIC_API_KEY is required (or pass --dry-run)");
      process.exit(1);
    }
    teacher = createRequestAdviceTeacher(apiKey);
  }

  const records = parseDatasetRecords(readFileSync(base, "utf8"));
  const { loadPolicyRanker } = await import("../src/ai/policy");
  const ranker = await loadPolicyRanker(readFileSync(model));
  const labeled = await labelDisagreements({
    records,
    ranker,
    teacher,
    gate: { minScoreFraction: config.minScoreFraction },
    limit: config.limit,
    concurrency: config.concurrency,
  });
  writeFileSync(config.teacherOut, `${serializeDatasetRecords(labeled)}\n`);
  console.log(
    `${records.length} records → ${labeled.length} teacher labels → ${config.teacherOut}`,
  );

  const train = spawnSync(config.python, [...trainArgs(config)], {
    cwd: repoRoot,
    stdio: "inherit",
  });
  if (train.status !== 0) {
    console.error(`training failed (exit ${train.status ?? "signal"})`);
    process.exit(1);
  }

  const loaderArgs = process.execArgv.filter((arg) => !arg.startsWith("--eval"));
  const benchmark = spawnSync(
    process.execPath,
    [...loaderArgs, ...benchmarkArgs(config)],
    { cwd: repoRoot, encoding: "utf8" },
  );
  process.stdout.write(benchmark.stdout ?? "");
  if (benchmark.status !== 0) {
    console.error(`benchmark failed (exit ${benchmark.status ?? "signal"})`);
    process.exit(1);
  }

  const baselineLabel = config.model.split("/").pop() ?? config.model;
  const candidateLabel = config.candidateOut.split("/").pop() ?? config.candidateOut;
  const baseline = parseAvgBlinds(benchmark.stdout ?? "", baselineLabel);
  const candidate = parseAvgBlinds(benchmark.stdout ?? "", candidateLabel);
  if (baseline === null || candidate === null) {
    console.error("could not parse avgBlinds from benchmark output");
    process.exit(1);
  }
  console.log(formatVerdict(shipVerdict(baseline, candidate), baselineLabel, candidateLabel));
}

const isMain =
  !!process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  await main();
}
