import { appendFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { HAND_MODEL_REPO_PATH, SHOP_MODEL_REPO_PATH } from "../src/ai/advisor/productionModels";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { sliceJobs } from "./generateDataset";
import { loadPolicyRanker } from "../src/ai/policy";
import { createPolicyAgent } from "../src/ai/policyAgent";
import { createHeadlessShopAgent } from "../src/ai/headlessShopAgent";
import { playHeadlessRun } from "../src/ai/headlessRun";
import type { HeadlessShopAgent, ShopView } from "../src/ai/headlessRun";
import type { DeepRunStart } from "../src/ai/deepRunStarts";

function flag(name: string, fallback: string): string {
  const idx = process.argv.indexOf(name);
  return idx >= 0 && idx + 1 < process.argv.length ? process.argv[idx + 1] : fallback;
}

export function capturingShopAgent(
  inner: HeadlessShopAgent,
  minAnte: number,
  onDeepStart: (start: DeepRunStart) => void,
): HeadlessShopAgent {
  let captured = false;
  return {
    buyAfterRound(view: ShopView) {
      if (!captured && view.ante >= minAnte && view.jokers.length > 0) {
        captured = true;
        onDeepStart({ ante: view.ante, jokers: view.jokers, handStats: view.handStats });
      }
      return inner.buyAfterRound(view);
    },
  };
}

const __filename = fileURLToPath(import.meta.url);
const isMain = !!process.argv[1] && resolve(process.argv[1]) === __filename;

async function runParallel(out: string, games: number, seedOffset: number, parallelJobs: number, forwarded: string[]): Promise<void> {
  const evalIdx = process.execArgv.indexOf("--eval");
  const loaderArgs = evalIdx >= 0 ? process.execArgv.slice(0, evalIdx) : [...process.execArgv];
  const tmpDir = mkdtempSync(join(tmpdir(), "browslatro-ds-"));
  const slices = sliceJobs(games, seedOffset, parallelJobs);
  console.log(`spawning ${slices.length} parallel capture jobs ...`);

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
            process.stderr.write(`  ${done}/${slices.length} capture jobs done\n`);
            resolveJob();
          } else {
            reject(new Error(`capture job ${i} (seed-offset ${slice.seedOffset}) exited ${String(code)}`));
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
  console.log(`wrote ${total} deep-run starts from ${games} games (${slices.length} jobs) to ${out}`);
}

async function main(): Promise<void> {
  const out = process.argv[2];
  if (out === undefined || out.startsWith("--")) {
    console.error("Usage: tsx scripts/captureDeepStarts.ts <out.jsonl> [--games N] [--min-ante N] [--seed-offset N] [--shop-model PATH] [--hand-model PATH] [--parallel-jobs N]");
    process.exit(1);
  }
  const games = Number(flag("--games", "500"));
  const minAnte = Number(flag("--min-ante", "5"));
  const seedOffset = Number(flag("--seed-offset", "0"));
  const shopModel = flag("--shop-model", SHOP_MODEL_REPO_PATH);
  const handModel = flag("--hand-model", HAND_MODEL_REPO_PATH);
  const parallelJobs = Number(flag("--parallel-jobs", "1"));

  if (parallelJobs > 1) {
    const forwarded = [
      "--min-ante", String(minAnte),
      "--shop-model", shopModel,
      "--hand-model", handModel,
    ];
    await runParallel(out, games, seedOffset, parallelJobs, forwarded);
    return;
  }

  const ranker = await loadPolicyRanker(readFileSync(handModel));
  const handAgent = createPolicyAgent(ranker);
  const inner = await createHeadlessShopAgent(shopModel, { holdConsumables: true });

  const lines: string[] = [];
  for (let g = 0; g < games; g += 1) {
    const holder: { start: DeepRunStart | null } = { start: null };
    const shopAgent = capturingShopAgent(inner, minAnte, (s) => {
      holder.start = s;
    });
    await playHeadlessRun(handAgent, { seed: seedOffset + g, shopAgent, maxAnte: 8 });
    if (holder.start !== null) lines.push(JSON.stringify(holder.start));
    if ((g + 1) % 100 === 0) console.log(`${g + 1}/${games} games, ${lines.length} starts`);
  }

  writeFileSync(out, lines.length > 0 ? `${lines.join("\n")}\n` : "");
  console.log(`wrote ${lines.length} deep-run starts from ${games} games to ${out}`);
}

if (isMain) {
  void main();
}
