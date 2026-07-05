import { readFileSync } from "node:fs";
import { HAND_MODEL_REPO_PATH, SHOP_MODEL_REPO_PATH } from "../src/ai/advisor/productionModels";
import { playHeadlessRun, type HeadlessShopAgent } from "../src/ai/headlessRun";
import { loadPolicyRanker } from "../src/ai/policy";
import { createPolicyAgent } from "../src/ai/policyAgent";
import { createHeadlessShopAgent } from "../src/ai/headlessShopAgent";
import { createJokerStackingShopAgent } from "../src/ai/rolloutShopAgent";

function intFlag(name: string, fallback: number): number {
  const i = process.argv.indexOf(name);
  if (i === -1 || i + 1 >= process.argv.length) return fallback;
  const v = Number.parseInt(process.argv[i + 1], 10);
  if (Number.isNaN(v)) throw new Error(`${name} expects an integer`);
  return v;
}

function stringFlag(name: string, fallback: string): string {
  const i = process.argv.indexOf(name);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : fallback;
}

const games = intFlag("--games", 200);
const handModel = stringFlag("--policy", HAND_MODEL_REPO_PATH);
const shopModel = stringFlag("--shop-policy", SHOP_MODEL_REPO_PATH);

const ranker = await loadPolicyRanker(readFileSync(handModel));
const hand = createPolicyAgent(ranker);
const trained = await createHeadlessShopAgent(shopModel, { holdConsumables: true });
const stacker = createJokerStackingShopAgent();

async function run(label: string, shopAgent: HeadlessShopAgent | undefined): Promise<void> {
  let won = 0;
  let blinds = 0;
  let ante = 0;
  for (let g = 0; g < games; g += 1) {
    const r = await playHeadlessRun(hand, { seed: 8000 + g, maxAnte: 8, shopAgent });
    if (r.won) won += 1;
    blinds += r.blindsCleared;
    ante += r.anteReached;
  }
  console.log(
    `${label.padEnd(26)} win ${((100 * won) / games).toFixed(0)}%  ` +
      `avgBlinds ${(blinds / games).toFixed(2)}  avgAnte ${(ante / games).toFixed(2)}`,
  );
}

console.log(`${games} games, hand policy ${handModel}`);
await run("no shop", undefined);
await run("trained shop policy", trained);
await run("jokerStacking heuristic", stacker);
