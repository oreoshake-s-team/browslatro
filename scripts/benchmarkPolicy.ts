import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { SHOP_MODEL_REPO_PATH } from "../src/ai/advisor/productionModels";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { FINAL_ANTE } from "../src/constants";
import { createGreedyAgent, createSkipAgent } from "../src/ai/agents";
import {
  aggregateRunResults,
  playAgentGames,
  type EvaluationResult,
} from "../src/ai/evaluateAgent";
import type { Distribution } from "../src/ai/evaluationStats";
import type { HeadlessAgent, HeadlessRunResult } from "../src/ai/headlessRun";
import type { HeadlessShopAgent } from "../src/ai/headlessRun";
import { createHeadlessShopAgent } from "../src/ai/headlessShopAgent";
import { createSearchShopAgent } from "../src/ai/searchShopAgent";
import { createDeckCatalog, DEFAULT_DECK, type Deck } from "../src/items/decks";
import { DEFAULT_STAKE, STAKE_ORDER, type Stake } from "../src/items/stakes";
import { loadPolicyRanker } from "../src/ai/policy";
import { createPolicyAgent } from "../src/ai/policyAgent";
import { sliceJobs } from "./generateDataset";
import { assertBenchmarkSeedRange, BENCHMARK_SEED_BASE } from "./seedSpaces";

const DEFAULT_SHOP_POLICY = SHOP_MODEL_REPO_PATH;

function deckFlag(): Deck {
  const raw = stringFlag("--deck", DEFAULT_DECK);
  const spec = createDeckCatalog().find((d) => d.id === raw);
  if (spec === undefined) {
    throw new Error(`unknown deck "${raw}"`);
  }
  if (!spec.implemented) {
    throw new Error(`deck "${raw}" is not implemented`);
  }
  return spec.id;
}

function stakeFlag(): Stake {
  const raw = stringFlag("--stake", DEFAULT_STAKE);
  const stake = STAKE_ORDER.find((s) => s === raw);
  if (stake === undefined) {
    throw new Error(`unknown stake "${raw}"`);
  }
  return stake;
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

function stringFlag(name: string, fallback: string): string {
  const index = process.argv.indexOf(name);
  if (index === -1 || index + 1 >= process.argv.length) return fallback;
  return process.argv[index + 1];
}

const modelPaths = process.argv
  .slice(2)
  .filter((arg, index, args) => !arg.startsWith("--") && args[index - 1]?.startsWith("--") !== true);
if (modelPaths.length === 0) {
  console.error(
    "Usage: yarn dlx tsx scripts/benchmarkPolicy.ts <model.onnx> [more.onnx ...] [--games N] [--seed-offset N] [--deck ID] [--stake ID] [--shop-policy PATH] [--hold-consumables] [--no-shop] [--skip] [--parallel-jobs N] [--allow-training-seeds]",
  );
  process.exit(1);
}

const games = intFlag("--games", 200);
const seedOffset = intFlag("--seed-offset", BENCHMARK_SEED_BASE);
const allowTrainingSeeds = process.argv.includes("--allow-training-seeds");
assertBenchmarkSeedRange(seedOffset, { allowTrainingSeeds });
const deck = deckFlag();
const stake = stakeFlag();
const shopDisabled = process.argv.includes("--no-shop");
const shopPolicyPath = stringFlag("--shop-policy", DEFAULT_SHOP_POLICY);
const holdConsumables = process.argv.includes("--hold-consumables");
const shopSearchValuePath = stringFlag("--shop-search", "");
const shopAgent: HeadlessShopAgent | undefined = shopDisabled
  ? undefined
  : shopSearchValuePath !== ""
    ? await createSearchShopAgent(shopSearchValuePath, shopPolicyPath, { holdConsumables })
    : await createHeadlessShopAgent(shopPolicyPath, { holdConsumables });

const useSkip = process.argv.includes("--skip");
const withSkip = (agent: HeadlessAgent): HeadlessAgent =>
  useSkip ? createSkipAgent(agent) : agent;

function formatRow(label: string, result: EvaluationResult): string {
  return [
    label.padEnd(28),
    result.winRate.toFixed(3).padStart(8),
    result.averageAnteReached.toFixed(2).padStart(9),
    result.averageBlindsCleared.toFixed(2).padStart(11),
    result.averageHandsPlayed.toFixed(2).padStart(11),
    result.averageBlindsSkipped.toFixed(2).padStart(11),
  ].join("");
}

function formatDistribution(label: string, d: Distribution): string {
  return [
    `  ${label.padEnd(8)}`,
    `mean ${d.mean.toFixed(2).padStart(7)}`,
    `sd ${d.stdDev.toFixed(2).padStart(6)}`,
    `min ${d.min.toFixed(2).padStart(6)}`,
    `p25 ${d.p25.toFixed(2).padStart(6)}`,
    `med ${d.median.toFixed(2).padStart(6)}`,
    `p75 ${d.p75.toFixed(2).padStart(6)}`,
    `max ${d.max.toFixed(2).padStart(6)}`,
  ].join("  ");
}

function formatDetail(label: string, result: EvaluationResult): string {
  const a = result.shopActivity;
  const winPct = (result.winRate * 100).toFixed(1);
  const errPct = (result.winRateStdErr * 100).toFixed(1);
  const histogram =
    result.lossAnteHistogram.length === 0
      ? "(none)"
      : result.lossAnteHistogram.map((h) => `a${h.ante}:${h.count}`).join("  ");
  return [
    `=== ${label} ===`,
    `  wins ${result.wins}/${result.games} (${winPct}% ± ${errPct}%)  reachedFinalAnte ${result.reachedFinalAnte}`,
    formatDistribution("ante", result.anteReached),
    formatDistribution("blinds", result.blindsCleared),
    formatDistribution("hands", result.handsPlayed),
    formatDistribution("skipped", result.blindsSkipped),
    formatDistribution("money", result.finalMoney),
    `  shop      rerolls ${a.rerolls.toFixed(2)}  jokers ${a.jokersBought.toFixed(2)}  ` +
      `consumables ${a.consumablesBought.toFixed(2)}  vouchers ${a.vouchersBought.toFixed(2)}  ` +
      `sold ${a.jokersSold.toFixed(2)}  packsOpened ${a.packsOpened.toFixed(2)}  ` +
      `packPicks ${a.packPicks.toFixed(2)}  spent ${a.moneySpent.toFixed(2)}`,
    `  lossesByAnte  ${histogram}`,
  ].join("\n");
}

interface AgentSlice {
  readonly label: string;
  readonly agentName: string;
  readonly results: HeadlessRunResult[];
}

async function playSlice(sliceGames: number, sliceSeedOffset: number): Promise<AgentSlice[]> {
  const out: AgentSlice[] = [];
  const greedy = await playAgentGames(() => withSkip(createGreedyAgent()), {
    games: sliceGames,
    seedOffset: sliceSeedOffset,
    deck,
    stake,
    shopAgent,
  });
  out.push({ label: "greedy (baseline)", agentName: greedy.agentName, results: [...greedy.results] });
  for (const path of modelPaths) {
    const ranker = await loadPolicyRanker(readFileSync(path));
    const r = await playAgentGames(() => withSkip(createPolicyAgent(ranker)), {
      games: sliceGames,
      seedOffset: sliceSeedOffset,
      deck,
      stake,
      shopAgent,
    });
    out.push({ label: basename(path), agentName: r.agentName, results: [...r.results] });
  }
  return out;
}

const rawOut = stringFlag("--raw-out", "");
if (rawOut !== "") {
  const slice = await playSlice(games, seedOffset);
  writeFileSync(rawOut, JSON.stringify(slice));
  process.exit(0);
}

const parallelJobs = intFlag("--parallel-jobs", 1);
const started = Date.now();

async function collectAgentSlices(): Promise<AgentSlice[]> {
  if (parallelJobs <= 1) return playSlice(games, seedOffset);
  const selfPath = fileURLToPath(import.meta.url);
  const evalIdx = process.execArgv.indexOf("--eval");
  const loaderArgs = evalIdx >= 0 ? process.execArgv.slice(0, evalIdx) : [...process.execArgv];
  const forwarded = [
    "--deck", deck,
    "--stake", stake,
    ...(shopDisabled ? ["--no-shop"] : ["--shop-policy", shopPolicyPath]),
    ...(shopSearchValuePath !== "" ? ["--shop-search", shopSearchValuePath] : []),
    ...(holdConsumables ? ["--hold-consumables"] : []),
    ...(useSkip ? ["--skip"] : []),
    ...(allowTrainingSeeds ? ["--allow-training-seeds"] : []),
  ];
  const tmpDir = mkdtempSync(join(tmpdir(), "browslatro-bench-"));
  const slices = sliceJobs(games, seedOffset, parallelJobs);
  console.log(`benchmarking across ${slices.length} parallel jobs ...`);
  const chunks = await Promise.all(
    slices.map((slice, i) => {
      const tmpFile = join(tmpDir, `chunk-${i}.json`);
      const args = [selfPath, ...modelPaths, "--games", String(slice.games), "--seed-offset", String(slice.seedOffset), "--raw-out", tmpFile, ...forwarded];
      return new Promise<AgentSlice[]>((resolve, reject) => {
        const proc = spawn(process.execPath, [...loaderArgs, ...args], { stdio: ["ignore", "ignore", "inherit"] });
        proc.on("close", (code) => {
          if (code === 0) resolve(JSON.parse(readFileSync(tmpFile, "utf8")) as AgentSlice[]);
          else reject(new Error(`benchmark job ${i} (seed-offset ${slice.seedOffset}) exited ${String(code)}`));
        });
      });
    }),
  );
  rmSync(tmpDir, { recursive: true });
  return chunks[0].map((first, idx) => ({
    label: first.label,
    agentName: first.agentName,
    results: chunks.flatMap((chunk) => chunk[idx].results),
  }));
}

const agents: { label: string; result: EvaluationResult }[] = (await collectAgentSlices()).map(
  (slice) => ({ label: slice.label, result: aggregateRunResults(slice.agentName, slice.results, FINAL_ANTE) }),
);

console.log(`${games} games per agent, seeds ${seedOffset}..${seedOffset + games - 1}`);
console.log(`deck: ${deck}, stake: ${stake}, skip: ${useSkip ? "on" : "off"}`);
console.log(
  `shop: ${shopAgent ? (shopSearchValuePath !== "" ? `visit-search(${basename(shopSearchValuePath)}) + ${basename(shopPolicyPath)} packs` : basename(shopPolicyPath)) : "disabled (no purchases)"}`,
);
console.log(
  ["model".padEnd(28), "winRate".padStart(8), "avgAnte".padStart(9), "avgBlinds".padStart(11), "avgHands".padStart(11), "avgSkipped".padStart(11)].join(""),
);
for (const { label, result } of agents) console.log(formatRow(label, result));
console.log("");
for (const { label, result } of agents) {
  console.log(formatDetail(label, result));
  console.log("");
}

const jsonPath = stringFlag("--json", "");
if (jsonPath !== "") {
  writeFileSync(
    jsonPath,
    `${JSON.stringify({ games, seedOffset, deck, stake, skip: useSkip, agents })}\n`,
  );
  console.log(`wrote ${jsonPath}`);
}

console.log(`done in ${((Date.now() - started) / 1000).toFixed(1)}s`);
