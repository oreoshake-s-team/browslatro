import { appendFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { HAND_MODEL_REPO_PATH, SHOP_MODEL_REPO_PATH } from "../src/ai/advisor/productionModels";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { sliceJobs } from "./generateDataset";
import { loadPolicyRanker } from "../src/ai/policy";
import { createPolicyAgent } from "../src/ai/policyAgent";
import {
  createHeadlessShopAgent,
  type ShopDecisionLog,
} from "../src/ai/headlessShopAgent";
import { playHeadlessRun, seededRng } from "../src/ai/headlessRun";
import { exploringStart, type SeededBuild } from "../src/ai/exploringStarts";
import { deepRunStart, parseDeepRunStarts, type DeepRunStart } from "../src/ai/deepRunStarts";
import { assertTrainingSeedRange } from "./seedSpaces";

function flag(name: string, fallback: string): string {
  const idx = process.argv.indexOf(name);
  return idx >= 0 && idx + 1 < process.argv.length ? process.argv[idx + 1] : fallback;
}

function softmaxSampler(rng: () => number, temperature: number) {
  return (logits: Float32Array, n: number): number => {
    let max = -Infinity;
    for (let i = 0; i < n; i += 1) if (logits[i] > max) max = logits[i];
    const probs = new Array<number>(n);
    let sum = 0;
    for (let i = 0; i < n; i += 1) {
      probs[i] = Math.exp((logits[i] - max) / temperature);
      sum += probs[i];
    }
    let r = rng() * sum;
    for (let i = 0; i < n; i += 1) {
      r -= probs[i];
      if (r <= 0) return i;
    }
    return n - 1;
  };
}

const __filename = fileURLToPath(import.meta.url);

async function runParallel(out: string, games: number, seedOffset: number, parallelJobs: number, forwarded: string[]): Promise<void> {
  const evalIdx = process.execArgv.indexOf("--eval");
  const loaderArgs = evalIdx >= 0 ? process.execArgv.slice(0, evalIdx) : [...process.execArgv];
  const tmpDir = mkdtempSync(join(tmpdir(), "browslatro-sp-"));
  const slices = sliceJobs(games, seedOffset, parallelJobs);
  console.log(`spawning ${slices.length} parallel self-play jobs ...`);

  let done = 0;
  await Promise.all(
    slices.map((slice, i) => {
      const tmpOut = join(tmpDir, `chunk-${i}.jsonl`);
      const args = [__filename, tmpOut, "--games", String(slice.games), "--seed-offset", String(slice.seedOffset), ...forwarded];
      return new Promise<void>((resolveJob, reject) => {
        const proc = spawn(process.execPath, [...loaderArgs, ...args], { stdio: ["ignore", "ignore", "inherit"] });
        proc.on("close", (code) => {
          if (code === 0) {
            done += 1;
            process.stderr.write(`  ${done}/${slices.length} self-play jobs done\n`);
            resolveJob();
          } else {
            reject(new Error(`self-play job ${i} (seed-offset ${slice.seedOffset}) exited ${String(code)}`));
          }
        });
      });
    }),
  );

  let total = 0;
  writeFileSync(out, "");
  for (let i = 0; i < slices.length; i += 1) {
    const content = readFileSync(join(tmpDir, `chunk-${i}.jsonl`), "utf8").trimEnd();
    if (content.length > 0) {
      total += content.split("\n").length;
      appendFileSync(out, `${content}\n`);
    }
  }
  rmSync(tmpDir, { recursive: true });
  console.log(`wrote ${total} self-play decisions from ${games} games (${slices.length} jobs) to ${out}`);
}

async function main(): Promise<void> {
  const out = process.argv[2];
  if (out === undefined || out.startsWith("--")) {
    console.error("Usage: tsx scripts/collectSelfPlayShop.ts <out.jsonl> [--games N] [--seed-offset N] [--shop-model PATH] [--hand-model PATH] [--temperature T] [--hold-consumables] [--exploring-starts-fraction F] [--starts-file PATH] [--parallel-jobs N]");
    process.exit(1);
  }
  const games = Number(flag("--games", "500"));
  const seedOffset = Number(flag("--seed-offset", "0"));
  const shopModel = flag("--shop-model", SHOP_MODEL_REPO_PATH);
  const handModel = flag("--hand-model", HAND_MODEL_REPO_PATH);
  const temperature = Number(flag("--temperature", "1.0"));
  const exploringFractionRaw = flag("--exploring-starts-fraction", "0");
  const startsFile = flag("--starts-file", "");
  const holdConsumables = process.argv.includes("--hold-consumables");
  const parallelJobs = Number(flag("--parallel-jobs", "1"));
  assertTrainingSeedRange(seedOffset, games);

  if (parallelJobs > 1) {
    const forwarded = [
      "--shop-model", shopModel,
      "--hand-model", handModel,
      "--temperature", String(temperature),
      "--exploring-starts-fraction", exploringFractionRaw,
      ...(startsFile !== "" ? ["--starts-file", startsFile] : []),
      ...(holdConsumables ? ["--hold-consumables"] : []),
    ];
    await runParallel(out, games, seedOffset, parallelJobs, forwarded);
    return;
  }

  const ranker = await loadPolicyRanker(readFileSync(handModel));
  const handAgent = createPolicyAgent(ranker);
  const rng = seededRng(seedOffset * 1_000_003 + 1);

  let buffer: ShopDecisionLog[] = [];
  const shopAgent = await createHeadlessShopAgent(shopModel, {
    chooseIndex: softmaxSampler(rng, temperature),
    onShopDecision: (log) => buffer.push(log),
    holdConsumables: process.argv.includes("--hold-consumables"),
  });

  const exploringFraction = Number(flag("--exploring-starts-fraction", "0"));
  const seedEvery =
    exploringFraction > 0 ? Math.max(1, Math.round(1 / exploringFraction)) : 0;
  const deepStarts: ReadonlyArray<DeepRunStart> | null =
    startsFile !== "" ? parseDeepRunStarts(readFileSync(startsFile, "utf8")) : null;
  const seededBuild = (index: number): SeededBuild =>
    deepStarts !== null ? deepRunStart(deepStarts, index) : exploringStart(index);
  if (deepStarts !== null) {
    console.log(`seeding from ${deepStarts.length} deep-run starts (${startsFile})`);
  }
  let seededGames = 0;

  const lines: string[] = [];
  let returns = 0;
  for (let g = 0; g < games; g += 1) {
    buffer = [];
    const seeded = seedEvery > 0 && g % seedEvery === 0;
    const start = seeded ? seededBuild(seededGames) : undefined;
    if (seeded) seededGames += 1;
    const result = await playHeadlessRun(handAgent, {
      seed: seedOffset + g,
      shopAgent,
      maxAnte: 8,
      ...(start !== undefined
        ? { jokers: start.jokers, startHandStats: start.handStats }
        : {}),
    });
    returns += result.blindsCleared;
    for (const log of buffer) {
      lines.push(JSON.stringify({ ...log, return: result.blindsCleared }));
    }
    if ((g + 1) % 100 === 0) console.log(`${g + 1}/${games} games, ${lines.length} decisions`);
  }

  writeFileSync(out, lines.length > 0 ? `${lines.join("\n")}\n` : "");
  console.log(`wrote ${lines.length} self-play decisions from ${games} games (avg return ${(returns / games).toFixed(2)}) to ${out}`);
}

main();
