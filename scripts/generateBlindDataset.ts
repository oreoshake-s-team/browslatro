import { writeFileSync } from "node:fs";
import {
  generateBlindDataset,
  serializeBlindRecords,
} from "../src/ai/blindDataset";

function intFlag(name: string, fallback: number): number {
  const index = process.argv.indexOf(name);
  if (index === -1 || index + 1 >= process.argv.length) return fallback;
  const value = Number.parseInt(process.argv[index + 1], 10);
  if (Number.isNaN(value)) {
    throw new Error(`${name} expects an integer, got ${process.argv[index + 1]}`);
  }
  return value;
}

function floatFlag(name: string, fallback: number): number {
  const index = process.argv.indexOf(name);
  if (index === -1 || index + 1 >= process.argv.length) return fallback;
  const value = Number.parseFloat(process.argv[index + 1]);
  if (Number.isNaN(value)) {
    throw new Error(`${name} expects a number, got ${process.argv[index + 1]}`);
  }
  return value;
}

async function main(): Promise<void> {
  const out = process.argv[2];
  if (out === undefined || out.startsWith("--")) {
    console.error(
      "usage: tsx scripts/generateBlindDataset.ts <out.jsonl> [--games N] " +
        "[--seed-offset N] [--max-ante N] [--winnable-rollouts N] " +
        "[--joker-loadout-fraction F]",
    );
    process.exit(1);
  }
  const result = await generateBlindDataset({
    games: intFlag("--games", 500),
    seedOffset: intFlag("--seed-offset", 0),
    maxAnte: intFlag("--max-ante", 8),
    winnableRollouts: intFlag("--winnable-rollouts", 8),
    jokerLoadoutFraction: floatFlag("--joker-loadout-fraction", 0.6),
  });
  writeFileSync(out, serializeBlindRecords(result.records) + "\n");
  const plays = result.records.filter((r) => r.chosenIndex === 0).length;
  const skips = result.records.length - plays;
  const wins = result.runs.filter((r) => r.won).length;
  console.error(
    `wrote ${result.records.length} blind decisions ` +
      `(${plays} play / ${skips} skip) to ${out} from ${result.runs.length} games; ` +
      `wins=${wins}`,
  );
}

void main();
