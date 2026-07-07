import "./loadEnv";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DATASET_SCHEMA_VERSION,
  serializeDatasetRecords,
  type DatasetRecord,
} from "../src/ai/dataset";
import type { HandOption } from "../src/ai/getHandOptions";
import type { AgentAction } from "../src/ai/headlessRun";
import type { ModelState } from "../src/ai/modelState";
import type { CandidateRanker } from "../src/ai/policy";

export type TeacherLabeler = (
  state: ModelState,
  candidates: ReadonlyArray<HandOption>,
) => Promise<number | null>;

export interface Disagreement {
  readonly record: DatasetRecord;
  readonly expertIndex: number;
  readonly onnxIndex: number;
}

export function parseDatasetRecords(jsonl: string): DatasetRecord[] {
  return jsonl
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as DatasetRecord)
    .filter((record) => record.schemaVersion === DATASET_SCHEMA_VERSION);
}

export async function findDisagreements(
  records: ReadonlyArray<DatasetRecord>,
  ranker: CandidateRanker,
): Promise<ReadonlyArray<Disagreement>> {
  const disagreements: Disagreement[] = [];
  for (const record of records) {
    if (record.candidates.length === 0) continue;
    const ranking = await ranker.rank(record.state, record.candidates);
    const onnxIndex = ranking[0];
    if (onnxIndex === undefined) continue;
    if (onnxIndex !== record.chosenIndex) {
      disagreements.push({
        record,
        expertIndex: record.chosenIndex,
        onnxIndex,
      });
    }
  }
  return disagreements;
}

function candidateAction(candidate: HandOption): AgentAction {
  return { kind: candidate.action, cardIds: [...candidate.cardIds] };
}

export async function mapWithConcurrency<T, R>(
  items: ReadonlyArray<T>,
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const worker = async (): Promise<void> => {
    while (true) {
      const index = next++;
      if (index >= items.length) return;
      results[index] = await fn(items[index], index);
    }
  };
  const poolSize = Math.max(1, Math.min(concurrency, items.length));
  await Promise.all(Array.from({ length: poolSize }, () => worker()));
  return results;
}

export async function relabelDisagreements(
  disagreements: ReadonlyArray<Disagreement>,
  teacher: TeacherLabeler,
  concurrency = 1,
): Promise<ReadonlyArray<DatasetRecord>> {
  const indices = await mapWithConcurrency(
    disagreements,
    concurrency,
    ({ record }) => teacher(record.state, record.candidates),
  );
  const labeled: DatasetRecord[] = [];
  disagreements.forEach(({ record }, i) => {
    const teacherIndex = indices[i];
    if (teacherIndex === null) return;
    if (teacherIndex < 0 || teacherIndex >= record.candidates.length) return;
    labeled.push({
      ...record,
      schemaVersion: DATASET_SCHEMA_VERSION,
      chosenIndex: teacherIndex,
      chosenAction: candidateAction(record.candidates[teacherIndex]),
    });
  });
  return labeled;
}

export interface QualityGateConfig {
  readonly minScoreFraction: number;
}

export const DEFAULT_QUALITY_GATE: QualityGateConfig = { minScoreFraction: 0.25 };

export function isLabelJustified(
  candidates: ReadonlyArray<HandOption>,
  chosenIndex: number,
  config: QualityGateConfig = DEFAULT_QUALITY_GATE,
): boolean {
  const chosen = candidates[chosenIndex];
  if (chosen === undefined) return false;
  if (chosen.action !== "play") return true;
  const playScores = candidates.flatMap((c) =>
    c.action === "play" ? [c.score] : [],
  );
  const bestPlayScore = playScores.length > 0 ? Math.max(...playScores) : 0;
  if (bestPlayScore <= 0) return true;
  return chosen.score >= bestPlayScore * config.minScoreFraction;
}

export function applyQualityGate(
  records: ReadonlyArray<DatasetRecord>,
  config: QualityGateConfig = DEFAULT_QUALITY_GATE,
): ReadonlyArray<DatasetRecord> {
  return records.filter((record) =>
    isLabelJustified(record.candidates, record.chosenIndex, config),
  );
}

export function capDisagreements(
  disagreements: ReadonlyArray<Disagreement>,
  limit: number,
): ReadonlyArray<Disagreement> {
  if (limit <= 0 || disagreements.length <= limit) return disagreements;
  const stride = disagreements.length / limit;
  return Array.from({ length: limit }, (_, i) => disagreements[Math.floor(i * stride)]);
}

export async function labelDisagreements(args: {
  readonly records: ReadonlyArray<DatasetRecord>;
  readonly ranker: CandidateRanker;
  readonly teacher: TeacherLabeler;
  readonly gate?: QualityGateConfig;
  readonly limit?: number;
  readonly concurrency?: number;
}): Promise<ReadonlyArray<DatasetRecord>> {
  const disagreements = await findDisagreements(args.records, args.ranker);
  const capped = capDisagreements(disagreements, args.limit ?? 0);
  const labeled = await relabelDisagreements(
    capped,
    args.teacher,
    args.concurrency ?? 1,
  );
  return applyQualityGate(labeled, args.gate ?? DEFAULT_QUALITY_GATE);
}

export function createRequestAdviceTeacher(apiKey: string): TeacherLabeler {
  return async (state, candidates) => {
    const { requestAdvice } = await import("../src/ai/advisor/model");
    const result = await requestAdvice({ state, candidates }, apiKey);
    return result.ok ? result.advice.recommendationIndex : null;
  };
}

function stringFlag(name: string, fallback: string): string {
  const index = process.argv.indexOf(name);
  if (index === -1 || index + 1 >= process.argv.length) return fallback;
  return process.argv[index + 1];
}

function floatFlag(name: string, fallback: number): number {
  const raw = stringFlag(name, "");
  if (raw === "") return fallback;
  const value = Number.parseFloat(raw);
  if (Number.isNaN(value)) {
    throw new Error(`${name} expects a number, got ${raw}`);
  }
  return value;
}

function intFlag(name: string, fallback: number): number {
  const raw = stringFlag(name, "");
  if (raw === "") return fallback;
  const value = Number.parseInt(raw, 10);
  if (Number.isNaN(value)) {
    throw new Error(`${name} expects an integer, got ${raw}`);
  }
  return value;
}

async function main(): Promise<void> {
  const inPath = process.argv[2];
  const outPath = process.argv[3];
  if (
    inPath === undefined ||
    outPath === undefined ||
    inPath.startsWith("--") ||
    outPath.startsWith("--")
  ) {
    console.error(
      "Usage: yarn dlx tsx scripts/labelDisagreements.ts <dataset.jsonl> <out.jsonl> --model <policy.onnx> [--min-score-fraction 0.25] [--limit N] [--concurrency 1]",
    );
    process.exit(1);
  }
  const modelPath = stringFlag("--model", "");
  if (modelPath === "") {
    console.error("--model <policy.onnx> is required");
    process.exit(1);
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey === undefined || apiKey === "") {
    console.error("ANTHROPIC_API_KEY is required");
    process.exit(1);
  }
  const minScoreFraction = floatFlag(
    "--min-score-fraction",
    DEFAULT_QUALITY_GATE.minScoreFraction,
  );
  const limit = intFlag("--limit", 0);
  const concurrency = intFlag("--concurrency", 1);

  const records = parseDatasetRecords(readFileSync(inPath, "utf8"));
  const { loadPolicyRanker } = await import("../src/ai/policy");
  const ranker = await loadPolicyRanker(readFileSync(modelPath));
  const teacher = createRequestAdviceTeacher(apiKey);

  const started = Date.now();
  const disagreements = await findDisagreements(records, ranker);
  const capped = capDisagreements(disagreements, limit);
  const labeled = await relabelDisagreements(capped, teacher, concurrency);
  const gated = applyQualityGate(labeled, { minScoreFraction });
  writeFileSync(outPath, `${serializeDatasetRecords(gated)}\n`);
  console.log(
    `${records.length} records → ${disagreements.length} disagreements → ` +
      `${capped.length} labeled (cap ${limit || "none"}, concurrency ${concurrency}) → ` +
      `${gated.length} pass quality gate ` +
      `(min-score-fraction=${minScoreFraction}, ${((Date.now() - started) / 1000).toFixed(1)}s)`,
  );
}

const isMain =
  !!process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  await main();
}
