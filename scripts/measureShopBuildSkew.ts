import { readFileSync } from "node:fs";
import { HAND_MODEL_REPO_PATH, SHOP_MODEL_REPO_PATH } from "../src/ai/advisor/productionModels";
import { basename } from "node:path";
import { EMPTY_SHOP_BUILD } from "../src/ai/advisor/shopEncoding";
import { evaluateAgent, type EvaluationResult } from "../src/ai/evaluateAgent";
import { createHeadlessShopAgent } from "../src/ai/headlessShopAgent";
import { loadPolicyRanker } from "../src/ai/policy";
import { createPolicyAgent } from "../src/ai/policyAgent";
import { DEFAULT_DECK } from "../src/items/decks";
import { DEFAULT_STAKE } from "../src/items/stakes";

function intFlag(name: string, fallback: number): number {
  const index = process.argv.indexOf(name);
  if (index === -1 || index + 1 >= process.argv.length) return fallback;
  const value = Number.parseInt(process.argv[index + 1], 10);
  if (Number.isNaN(value)) throw new Error(`${name} expects an integer`);
  return value;
}

function stringFlag(name: string, fallback: string): string {
  const index = process.argv.indexOf(name);
  if (index === -1 || index + 1 >= process.argv.length) return fallback;
  return process.argv[index + 1];
}

const games = intFlag("--games", 200);
const seedOffset = intFlag("--seed-offset", 5000);
const shopPolicy = stringFlag("--shop-policy", SHOP_MODEL_REPO_PATH);
const gamePolicy = stringFlag("--policy", HAND_MODEL_REPO_PATH);

const ranker = await loadPolicyRanker(readFileSync(gamePolicy));
const realShop = await createHeadlessShopAgent(shopPolicy);
const emptyShop = await createHeadlessShopAgent(shopPolicy, {
  buildOverride: () => EMPTY_SHOP_BUILD,
});

async function run(shopAgent: Awaited<ReturnType<typeof createHeadlessShopAgent>>): Promise<EvaluationResult> {
  return evaluateAgent(() => createPolicyAgent(ranker), {
    games,
    seedOffset,
    deck: DEFAULT_DECK,
    stake: DEFAULT_STAKE,
    shopAgent,
  });
}

const empty = await run(emptyShop);
const real = await run(realShop);

function row(label: string, r: EvaluationResult): string {
  const a = r.shopActivity;
  return [
    label.padEnd(22),
    `rerolls ${a.rerolls.toFixed(2)}`.padEnd(16),
    `jokers ${a.jokersBought.toFixed(2)}`.padEnd(15),
    `vouchers ${a.vouchersBought.toFixed(2)}`.padEnd(17),
    `avgBlinds ${r.averageBlindsCleared.toFixed(3)}`.padEnd(20),
    `win ${(r.winRate * 100).toFixed(1)}%`,
  ].join("  ");
}

console.log(`${games} games, seeds ${seedOffset}..${seedOffset + games - 1}`);
console.log(`shop policy: ${basename(shopPolicy)}, game policy: ${basename(gamePolicy)}`);
console.log("");
console.log(row("empty build (the bug)", empty));
console.log(row("real build (the fix)", real));
console.log("");
const rerollDelta = empty.shopActivity.rerolls - real.shopActivity.rerolls;
const blindDelta = real.averageBlindsCleared - empty.averageBlindsCleared;
console.log(
  `empty build rerolls ${rerollDelta >= 0 ? "+" : ""}${rerollDelta.toFixed(2)} per run vs real build; ` +
    `real build clears ${blindDelta >= 0 ? "+" : ""}${blindDelta.toFixed(3)} more blinds`,
);
