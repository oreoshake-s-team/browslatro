import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHeadlessShopAgent } from "../src/ai/headlessShopAgent";
import {
  generateDataset,
  serializeDatasetRecords,
} from "../src/ai/dataset";

function stringFlag(name: string, fallback: string): string {
  const index = process.argv.indexOf(name);
  if (index === -1 || index + 1 >= process.argv.length) return fallback;
  return process.argv[index + 1];
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

export function intFlag(name: string, fallback: number): number {
  const index = process.argv.indexOf(name);
  if (index === -1 || index + 1 >= process.argv.length) return fallback;
  const value = Number.parseInt(process.argv[index + 1], 10);
  if (Number.isNaN(value)) {
    throw new Error(`${name} expects an integer, got ${process.argv[index + 1]}`);
  }
  return value;
}

export type JobSlice = { readonly games: number; readonly seedOffset: number };

export function sliceJobs(
  totalGames: number,
  baseSeedOffset: number,
  jobCount: number,
): JobSlice[] {
  const actual = Math.min(jobCount, totalGames);
  const base = Math.floor(totalGames / actual);
  const remainder = totalGames % actual;
  let offset = baseSeedOffset;
  return Array.from({ length: actual }, (_, i) => {
    const games = base + (i < remainder ? 1 : 0);
    const slice: JobSlice = { games, seedOffset: offset };
    offset += games;
    return slice;
  });
}

const __filename = fileURLToPath(import.meta.url);
const isMain = !!process.argv[1] && resolve(process.argv[1]) === __filename;

if (isMain) {
  const outPath = process.argv[2];
  if (outPath === undefined || outPath.startsWith("--")) {
    console.error(
      "Usage: yarn dlx tsx scripts/generateDataset.ts <out.jsonl> [--games N] [--seed-offset N] [--rollouts N] [--top-n N] [--max-ante N] [--joker-loadout-fraction F] [--parallel-jobs N] [--shop-policy PATH]",
    );
    process.exit(1);
  }

  const shopPolicyPath = stringFlag("--shop-policy", "");
  const config = {
    games: intFlag("--games", 100),
    seedOffset: intFlag("--seed-offset", 0),
    rollouts: intFlag("--rollouts", 4),
    topN: intFlag("--top-n", 3),
    maxAnte: intFlag("--max-ante", 8),
    jokerLoadoutFraction: floatFlag("--joker-loadout-fraction", 0),
  };

  const parallelJobs = intFlag("--parallel-jobs", 1);

  if (parallelJobs > 1) {
    const evalIdx = process.execArgv.indexOf("--eval");
    const loaderArgs = evalIdx >= 0 ? process.execArgv.slice(0, evalIdx) : [...process.execArgv];
    const tmpDir = mkdtempSync(join(tmpdir(), "browslatro-ds-"));
    const slices = sliceJobs(config.games, config.seedOffset, parallelJobs);

    const started = Date.now();
    console.log(`spawning ${slices.length} parallel jobs ...`);

    let done = 0;
    await Promise.all(
      slices.map((slice, i) => {
        const tmpOut = join(tmpDir, `chunk-${i}.jsonl`);
        return new Promise<void>((resolve, reject) => {
          const args = [
            __filename,
            tmpOut,
            "--games", String(slice.games),
            "--seed-offset", String(slice.seedOffset),
            "--rollouts", String(config.rollouts),
            "--top-n", String(config.topN),
            "--max-ante", String(config.maxAnte),
            ...(config.jokerLoadoutFraction > 0
              ? ["--joker-loadout-fraction", String(config.jokerLoadoutFraction)]
              : []),
            ...(shopPolicyPath !== "" ? ["--shop-policy", shopPolicyPath] : []),
          ];
          const proc = spawn(process.execPath, [...loaderArgs, ...args], { stdio: ["ignore", "ignore", "inherit"] });
          proc.on("close", (code) => {
            if (code === 0) {
              done += 1;
              process.stderr.write(`  ${done}/${slices.length} jobs done\n`);
              resolve();
            } else {
              reject(new Error(`job ${i} (seed-offset ${slice.seedOffset}) exited ${String(code)}`));
            }
          });
        });
      }),
    );

    let totalRecords = 0;
    const parts: string[] = [];
    for (let i = 0; i < slices.length; i += 1) {
      const content = readFileSync(join(tmpDir, `chunk-${i}.jsonl`), "utf8").trimEnd();
      if (content.length > 0) {
        totalRecords += content.split("\n").length;
        parts.push(content);
      }
    }
    writeFileSync(outPath, `${parts.join("\n")}\n`);
    rmSync(tmpDir, { recursive: true });

    console.log(
      `${totalRecords} records from ${config.games} games in ${((Date.now() - started) / 1000).toFixed(1)}s`,
    );
    console.log(`wrote ${outPath}`);
  } else {
    const started = Date.now();
    const shopAgent =
      shopPolicyPath !== "" ? await createHeadlessShopAgent(shopPolicyPath) : undefined;
    const { records, runs } = await generateDataset({ ...config, shopAgent });
    writeFileSync(outPath, `${serializeDatasetRecords(records)}\n`);

    const wins = runs.filter((r) => r.won).length;
    const blinds = runs.reduce((sum, r) => sum + r.blindsCleared, 0) / runs.length;
    console.log(
      `${records.length} records from ${config.games} games in ${((Date.now() - started) / 1000).toFixed(1)}s`,
    );
    console.log(`expert: winRate=${wins / runs.length} avgBlindsCleared=${blinds.toFixed(2)}`);
    console.log(`wrote ${outPath}`);
  }
}
