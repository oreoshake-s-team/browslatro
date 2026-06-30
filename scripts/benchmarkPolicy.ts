import { readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";
import { createGreedyAgent, createSkipAgent } from "../src/ai/agents";
import { evaluateAgent, type EvaluationResult } from "../src/ai/evaluateAgent";
import type { Distribution } from "../src/ai/evaluationStats";
import type { HeadlessAgent } from "../src/ai/headlessRun";
import type { HeadlessShopAgent } from "../src/ai/headlessRun";
import { createHeadlessShopAgent } from "../src/ai/headlessShopAgent";
import { createDeckCatalog, DEFAULT_DECK, type Deck } from "../src/items/decks";
import { DEFAULT_STAKE, STAKE_ORDER, type Stake } from "../src/items/stakes";
import { loadPolicyRanker } from "../src/ai/policy";
import { createPolicyAgent } from "../src/ai/policyAgent";

const DEFAULT_SHOP_POLICY = "public/models/advisor-shop-policy-v13.onnx";

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
    "Usage: yarn dlx tsx scripts/benchmarkPolicy.ts <model.onnx> [more.onnx ...] [--games N] [--seed-offset N] [--deck ID] [--stake ID] [--shop-policy PATH] [--no-shop] [--skip]",
  );
  process.exit(1);
}

const games = intFlag("--games", 200);
const seedOffset = intFlag("--seed-offset", 5000);
const deck = deckFlag();
const stake = stakeFlag();
const shopDisabled = process.argv.includes("--no-shop");
const shopPolicyPath = stringFlag("--shop-policy", DEFAULT_SHOP_POLICY);
const holdConsumables = process.argv.includes("--hold-consumables");
const shopAgent: HeadlessShopAgent | undefined = shopDisabled
  ? undefined
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

const started = Date.now();
const agents: { label: string; result: EvaluationResult }[] = [];
const greedy = await evaluateAgent(() => withSkip(createGreedyAgent()), {
  games,
  seedOffset,
  deck,
  stake,
  shopAgent,
});
agents.push({ label: "greedy (baseline)", result: greedy });
for (const path of modelPaths) {
  const ranker = await loadPolicyRanker(readFileSync(path));
  const result = await evaluateAgent(() => withSkip(createPolicyAgent(ranker)), {
    games,
    seedOffset,
    deck,
    stake,
    shopAgent,
  });
  agents.push({ label: basename(path), result });
}

console.log(`${games} games per agent, seeds ${seedOffset}..${seedOffset + games - 1}`);
console.log(`deck: ${deck}, stake: ${stake}, skip: ${useSkip ? "on" : "off"}`);
console.log(`shop: ${shopAgent ? basename(shopPolicyPath) : "disabled (no purchases)"}`);
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
