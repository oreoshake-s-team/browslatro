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

export async function relabelDisagreements(
  disagreements: ReadonlyArray<Disagreement>,
  teacher: TeacherLabeler,
): Promise<ReadonlyArray<DatasetRecord>> {
  const labeled: DatasetRecord[] = [];
  for (const { record } of disagreements) {
    const teacherIndex = await teacher(record.state, record.candidates);
    if (teacherIndex === null) continue;
    if (teacherIndex < 0 || teacherIndex >= record.candidates.length) continue;
    labeled.push({
      ...record,
      schemaVersion: DATASET_SCHEMA_VERSION,
      chosenIndex: teacherIndex,
      chosenAction: candidateAction(record.candidates[teacherIndex]),
    });
  }
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

export async function labelDisagreements(args: {
  readonly records: ReadonlyArray<DatasetRecord>;
  readonly ranker: CandidateRanker;
  readonly teacher: TeacherLabeler;
  readonly gate?: QualityGateConfig;
}): Promise<ReadonlyArray<DatasetRecord>> {
  const disagreements = await findDisagreements(args.records, args.ranker);
  const labeled = await relabelDisagreements(disagreements, args.teacher);
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
      "Usage: yarn dlx tsx scripts/labelDisagreements.ts <dataset.jsonl> <out.jsonl> --model <policy.onnx> [--min-score-fraction 0.25]",
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

  const records = parseDatasetRecords(readFileSync(inPath, "utf8"));
  const { loadPolicyRanker } = await import("../src/ai/policy");
  const ranker = await loadPolicyRanker(readFileSync(modelPath));
  const teacher = createRequestAdviceTeacher(apiKey);

  const started = Date.now();
  const disagreements = await findDisagreements(records, ranker);
  const labeled = await relabelDisagreements(disagreements, teacher);
  const gated = applyQualityGate(labeled, { minScoreFraction });
  writeFileSync(outPath, `${serializeDatasetRecords(gated)}\n`);
  console.log(
    `${records.length} records → ${disagreements.length} disagreements → ` +
      `${labeled.length} teacher-labeled → ${gated.length} pass quality gate ` +
      `(min-score-fraction=${minScoreFraction}, ${((Date.now() - started) / 1000).toFixed(1)}s)`,
  );
}

const isMain =
  !!process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  await main();
}
