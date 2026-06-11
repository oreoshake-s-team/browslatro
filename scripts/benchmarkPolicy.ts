import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { createGreedyAgent } from "../src/ai/agents";
import { evaluateAgent, type EvaluationResult } from "../src/ai/evaluateAgent";
import { loadPolicyRanker } from "../src/ai/policy";
import { createPolicyAgent } from "../src/ai/policyAgent";

function intFlag(name: string, fallback: number): number {
  const index = process.argv.indexOf(name);
  if (index === -1 || index + 1 >= process.argv.length) return fallback;
  const value = Number.parseInt(process.argv[index + 1], 10);
  if (Number.isNaN(value)) {
    throw new Error(`${name} expects an integer, got ${process.argv[index + 1]}`);
  }
  return value;
}

const modelPaths = process.argv
  .slice(2)
  .filter((arg, index, args) => !arg.startsWith("--") && args[index - 1]?.startsWith("--") !== true);
if (modelPaths.length === 0) {
  console.error(
    "Usage: yarn dlx tsx scripts/benchmarkPolicy.ts <model.onnx> [more.onnx ...] [--games N] [--seed-offset N]",
  );
  process.exit(1);
}

const games = intFlag("--games", 200);
const seedOffset = intFlag("--seed-offset", 5000);

function formatRow(label: string, result: EvaluationResult): string {
  return [
    label.padEnd(28),
    result.winRate.toFixed(3).padStart(8),
    result.averageAnteReached.toFixed(2).padStart(9),
    result.averageBlindsCleared.toFixed(2).padStart(11),
    result.averageHandsPlayed.toFixed(2).padStart(11),
  ].join("");
}

const started = Date.now();
const rows: string[] = [];
const greedy = await evaluateAgent(() => createGreedyAgent(), { games, seedOffset });
rows.push(formatRow("greedy (baseline)", greedy));
for (const path of modelPaths) {
  const ranker = await loadPolicyRanker(readFileSync(path));
  const result = await evaluateAgent(() => createPolicyAgent(ranker), {
    games,
    seedOffset,
  });
  rows.push(formatRow(basename(path), result));
}

console.log(`${games} games per agent, seeds ${seedOffset}..${seedOffset + games - 1}`);
console.log(
  ["model".padEnd(28), "winRate".padStart(8), "avgAnte".padStart(9), "avgBlinds".padStart(11), "avgHands".padStart(11)].join(""),
);
for (const row of rows) console.log(row);
console.log(`done in ${((Date.now() - started) / 1000).toFixed(1)}s`);
