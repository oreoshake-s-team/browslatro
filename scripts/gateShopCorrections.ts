/**
 * Quality-gates shop advice-feedback corrections by rolling their candidates
 * forward in the engine, so a human's bad shop pick is not distilled into the
 * policy. Reads a human-play export, drops shop corrections whose corrected
 * pick rolls out well below the best available choice, and writes the rest
 * through unchanged (moves, purchases, hand corrections, reroll/voucher shop
 * corrections it cannot value — all kept).
 *
 * The faithful PostShopState comes from the `rollout` field captured on the
 * record (jokers + handStats + deck + offers). The result is fed to
 * `train.py --shop --corrections`; the hand quality gate stays in train.py's
 * --min-score-fraction.
 *
 *   yarn dlx tsx scripts/gateShopCorrections.ts <in.jsonl> <out.jsonl> \
 *     [--hand-model PATH] [--horizon N] [--rollouts N] [--min-score-fraction 0.25]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { HAND_MODEL_REPO_PATH } from "../src/ai/advisor/productionModels";

import { createPolicyAgent } from "../src/ai/policyAgent";
import { loadPolicyRanker } from "../src/ai/policy";
import {
  type ConsumableLabelDeps,
  type RolloutOptions,
} from "../src/ai/shopRolloutExpert";
import { createJokerStackingShopAgent } from "../src/ai/rolloutShopAgent";
import {
  DEFAULT_SHOP_GATE,
  gateShopCorrections,
} from "../src/ai/shopCorrectionGate";
import type { RunEventRecord } from "../src/ai/runEvents";
import { createJokerCatalog } from "../src/items/jokers";
import { createPlanetCatalog } from "../src/items/planets";
import { createTarotCatalog } from "../src/items/tarots";

function stringFlag(name: string, fallback: string): string {
  const idx = process.argv.indexOf(name);
  return idx >= 0 ? process.argv[idx + 1] : fallback;
}

function intFlag(name: string, fallback: number): number {
  const idx = process.argv.indexOf(name);
  return idx >= 0 ? Number.parseInt(process.argv[idx + 1], 10) : fallback;
}

function floatFlag(name: string, fallback: number): number {
  const idx = process.argv.indexOf(name);
  return idx >= 0 ? Number.parseFloat(process.argv[idx + 1]) : fallback;
}

async function main(): Promise<void> {
  const inPath = process.argv[2];
  const outPath = process.argv[3];
  if (
    inPath === undefined ||
    outPath === undefined ||
    inPath.startsWith("--") ||
    outPath.startsWith("--")
  ) {
    console.error(
      "Usage: yarn dlx tsx scripts/gateShopCorrections.ts <in.jsonl> <out.jsonl> [--hand-model PATH] [--horizon N] [--rollouts N] [--min-score-fraction 0.25]",
    );
    process.exit(1);
  }

  const ranker = await loadPolicyRanker(
    readFileSync(stringFlag("--hand-model", HAND_MODEL_REPO_PATH)),
  );
  const consumableDeps: ConsumableLabelDeps = {
    jokerCatalog: createJokerCatalog().filter((j) => j.rarity !== "legendary"),
    planetCatalog: createPlanetCatalog(),
    tarotCatalog: createTarotCatalog(),
  };
  const opts: RolloutOptions = {
    agent: createPolicyAgent(ranker),
    horizonAntes: intFlag("--horizon", 8),
    rollouts: intFlag("--rollouts", 2),
    maxAnte: 8,
    consumableDeps,
    rolloutShopAgent: createJokerStackingShopAgent(),
  };
  const minScoreFraction = floatFlag(
    "--min-score-fraction",
    DEFAULT_SHOP_GATE.minScoreFraction,
  );

  const records = readFileSync(inPath, "utf8")
    .trim()
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as RunEventRecord);
  const kept = await gateShopCorrections(records, opts, { minScoreFraction });
  writeFileSync(
    outPath,
    kept.map((record) => JSON.stringify(record)).join("\n") +
      (kept.length > 0 ? "\n" : ""),
  );
  console.error(
    `gated ${records.length} records -> kept ${kept.length}, dropped ${
      records.length - kept.length
    } shop correction(s)`,
  );
}

void main();
