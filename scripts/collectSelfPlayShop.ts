import { readFileSync, writeFileSync } from "node:fs";
import { loadPolicyRanker } from "../src/ai/policy";
import { createPolicyAgent } from "../src/ai/policyAgent";
import {
  createHeadlessShopAgent,
  type ShopDecisionLog,
} from "../src/ai/headlessShopAgent";
import { playHeadlessRun, seededRng } from "../src/ai/headlessRun";
import { exploringStart } from "../src/ai/exploringStarts";

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

async function main(): Promise<void> {
  const out = process.argv[2];
  if (out === undefined || out.startsWith("--")) {
    console.error("Usage: tsx scripts/collectSelfPlayShop.ts <out.jsonl> [--games N] [--seed-offset N] [--shop-model PATH] [--hand-model PATH] [--temperature T]");
    process.exit(1);
  }
  const games = Number(flag("--games", "500"));
  const seedOffset = Number(flag("--seed-offset", "0"));
  const shopModel = flag("--shop-model", "public/models/advisor-shop-policy-v10.onnx");
  const handModel = flag("--hand-model", "public/models/advisor-policy-v9.onnx");
  const temperature = Number(flag("--temperature", "1.0"));

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
  let seededGames = 0;

  const lines: string[] = [];
  let returns = 0;
  for (let g = 0; g < games; g += 1) {
    buffer = [];
    const seeded = seedEvery > 0 && g % seedEvery === 0;
    const start = seeded ? exploringStart(seededGames) : undefined;
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
