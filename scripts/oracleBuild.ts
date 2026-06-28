import { readFileSync } from "node:fs";
import { playHeadlessRun } from "../src/ai/headlessRun";
import { loadPolicyRanker } from "../src/ai/policy";
import { createPolicyAgent } from "../src/ai/policyAgent";
import { createDefaultHandStats, type HandStats } from "../src/scoring/handStats";
import { applyPlanetUpgrade, createPlanetCatalog, type PlanetCard } from "../src/items/planets";
import {
  createCleverJoker,
  createJollyJoker,
  createPlusFourMultJoker,
  createSlyJoker,
  createTheDuoJoker,
} from "../src/items/jokers/factories";
import type { Joker } from "../src/items/jokers/types";

function intFlag(name: string, fallback: number): number {
  const i = process.argv.indexOf(name);
  if (i === -1 || i + 1 >= process.argv.length) return fallback;
  const v = Number.parseInt(process.argv[i + 1], 10);
  if (Number.isNaN(v)) throw new Error(`${name} expects an integer`);
  return v;
}

const games = intFlag("--games", 100);
const handModel = (() => {
  const i = process.argv.indexOf("--policy");
  return i >= 0 && i + 1 < process.argv.length
    ? process.argv[i + 1]
    : "public/models/advisor-policy-v9.onnx";
})();

const ranker = await loadPolicyRanker(readFileSync(handModel));
const agent = createPolicyAgent(ranker);
const mercury = createPlanetCatalog().find((p) => p.id === "mercury");
if (mercury === undefined) throw new Error("expected the Mercury planet (levels Pair)");
const mercuryCard: PlanetCard = mercury;

function pairLeveled(levels: number): HandStats {
  let stats = createDefaultHandStats();
  for (let i = 0; i < levels; i += 1) stats = applyPlanetUpgrade(stats, mercuryCard);
  return stats;
}

const oracleJokers: Joker[] = [
  createTheDuoJoker(),
  createJollyJoker(),
  createSlyJoker(),
  createCleverJoker(),
  createPlusFourMultJoker(),
];

async function run(label: string, jokers: Joker[], handStats: HandStats): Promise<void> {
  let won = 0;
  let blinds = 0;
  let ante = 0;
  for (let g = 0; g < games; g += 1) {
    const result = await playHeadlessRun(agent, {
      seed: 7000 + g,
      maxAnte: 8,
      jokers,
      startHandStats: handStats,
    });
    if (result.won) won += 1;
    blinds += result.blindsCleared;
    ante += result.anteReached;
  }
  console.log(
    `${label.padEnd(28)} win ${((100 * won) / games).toFixed(0)}%  ` +
      `avgBlinds ${(blinds / games).toFixed(2)}  avgAnte ${(ante / games).toFixed(2)}`,
  );
}

console.log(`${games} games per build, hand policy ${handModel}, no shop (fixed build)`);
await run("baseline (no build)", [], createDefaultHandStats());
await run("oracle + Pair L10", oracleJokers, pairLeveled(10));
await run("oracle + Pair L25", oracleJokers, pairLeveled(25));
await run("oracle + Pair L40", oracleJokers, pairLeveled(40));
