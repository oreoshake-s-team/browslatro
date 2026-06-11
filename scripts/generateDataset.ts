import { writeFileSync } from "node:fs";
import {
  generateDataset,
  serializeDatasetRecords,
} from "../src/ai/dataset";

function floatFlag(name: string, fallback: number): number {
  const index = process.argv.indexOf(name);
  if (index === -1 || index + 1 >= process.argv.length) return fallback;
  const value = Number.parseFloat(process.argv[index + 1]);
  if (Number.isNaN(value)) {
    throw new Error(`${name} expects a number, got ${process.argv[index + 1]}`);
  }
  return value;
}

function intFlag(name: string, fallback: number): number {
  const index = process.argv.indexOf(name);
  if (index === -1 || index + 1 >= process.argv.length) return fallback;
  const value = Number.parseInt(process.argv[index + 1], 10);
  if (Number.isNaN(value)) {
    throw new Error(`${name} expects an integer, got ${process.argv[index + 1]}`);
  }
  return value;
}

const outPath = process.argv[2];
if (outPath === undefined || outPath.startsWith("--")) {
  console.error(
    "Usage: yarn dlx tsx scripts/generateDataset.ts <out.jsonl> [--games N] [--seed-offset N] [--rollouts N] [--top-n N] [--max-ante N] [--joker-loadout-fraction F]",
  );
  process.exit(1);
}

const config = {
  games: intFlag("--games", 100),
  seedOffset: intFlag("--seed-offset", 0),
  rollouts: intFlag("--rollouts", 4),
  topN: intFlag("--top-n", 3),
  maxAnte: intFlag("--max-ante", 8),
  jokerLoadoutFraction: floatFlag("--joker-loadout-fraction", 0),
};

const started = Date.now();
const { records, runs } = await generateDataset(config);
writeFileSync(outPath, `${serializeDatasetRecords(records)}\n`);

const wins = runs.filter((r) => r.won).length;
const blinds = runs.reduce((sum, r) => sum + r.blindsCleared, 0) / runs.length;
console.log(
  `${records.length} records from ${config.games} games in ${((Date.now() - started) / 1000).toFixed(1)}s`,
);
console.log(`expert: winRate=${wins / runs.length} avgBlindsCleared=${blinds.toFixed(2)}`);
console.log(`wrote ${outPath}`);
