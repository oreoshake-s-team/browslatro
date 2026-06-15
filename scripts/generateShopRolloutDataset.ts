import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, appendFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve as resolvePath } from "node:path";
import { fileURLToPath } from "node:url";

import { createPolicyAgent } from "../src/ai/policyAgent";
import { loadPolicyRanker } from "../src/ai/policy";
import {
  buildHeadlessDeck,
  playHeadlessRun,
  seededRng,
  type HeadlessShopAgent,
  type ShopResult,
  type ShopView,
} from "../src/ai/headlessRun";
import {
  bestShopChoice,
  applyOfferToState,
  rolloutValue,
  type ConsumableLabelDeps,
  type RolloutOptions,
  type PostShopState,
} from "../src/ai/shopRolloutExpert";
import { RUN_EVENT_SCHEMA_VERSION } from "../src/ai/runEvents";
import { createJokerCatalog } from "../src/items/jokers";
import { createPlanetCatalog, applyPlanetUpgrade } from "../src/items/planets";
import { createTarotCatalog } from "../src/items/tarots";
import { createSpectralCatalog } from "../src/items/spectrals";
import { pickShopOffers, type ShopItem } from "../src/items/shop";
import { packPickLimit, type PackOption } from "../src/items/packs";
import { MAX_JOKERS } from "../src/items/jokers/constants";
import { intFlag, sliceJobs } from "./generateDataset";

const __filename = fileURLToPath(import.meta.url);
const isMain = !!process.argv[1] && resolvePath(process.argv[1]) === __filename;

function stringFlag(name: string, fallback: string): string {
  const index = process.argv.indexOf(name);
  if (index === -1 || index + 1 >= process.argv.length) return fallback;
  return process.argv[index + 1];
}

function shopItemSnapshot(item: ShopItem): { itemType: string; id: string; name: string; cost: number } {
  if (item.kind === "joker") return { itemType: "joker", id: item.joker.id, name: item.joker.name, cost: item.price };
  if (item.kind === "planet") return { itemType: "planet", id: item.planet.id, name: item.planet.name, cost: item.price };
  if (item.kind === "tarot") return { itemType: "tarot", id: item.tarot.id, name: item.tarot.name, cost: item.price };
  if (item.kind === "spectral") return { itemType: "spectral", id: item.spectral.id, name: item.spectral.name, cost: item.price };
  if (item.kind === "pack") return { itemType: "pack", id: item.pack.pool, name: item.pack.pool, cost: item.price };
  return { itemType: "playing-card", id: "card", name: "Card", cost: item.price };
}

function packOptionSnapshot(opt: PackOption): { optionType: string; id: string; name: string } {
  if (opt.kind === "joker") return { optionType: "joker", id: opt.joker.id, name: opt.joker.name };
  if (opt.kind === "planet") return { optionType: "planet", id: opt.planet.id, name: opt.planet.name };
  if (opt.kind === "tarot") return { optionType: "tarot", id: opt.tarot.id, name: opt.tarot.name };
  if (opt.kind === "spectral") return { optionType: "spectral", id: opt.spectral.id, name: opt.spectral.name };
  return { optionType: "playing-card", id: `${opt.card.rank}${opt.card.suit}`, name: `${opt.card.rank} of ${opt.card.suit}` };
}

function applyPackOption(opt: PackOption, state: PostShopState): PostShopState | null {
  if (opt.kind === "joker") {
    if (state.jokers.length >= MAX_JOKERS) return null;
    return { ...state, jokers: [...state.jokers, opt.joker] };
  }
  if (opt.kind === "planet") {
    return { ...state, handStats: applyPlanetUpgrade(state.handStats, opt.planet) };
  }
  return null;
}

interface GenConfig {
  readonly games: number;
  readonly seedOffset: number;
  readonly handModel: string;
  readonly horizon: number;
  readonly rollouts: number;
}

async function generate(config: GenConfig, sink: (line: string) => void): Promise<number> {
  const ranker = await loadPolicyRanker(readFileSync(config.handModel));
  const handAgent = createPolicyAgent(ranker);
  const jokerCatalog = createJokerCatalog().filter((j) => j.rarity !== "legendary");
  const planetCatalog = createPlanetCatalog();
  const tarotCatalog = createTarotCatalog();
  const spectralCatalog = createSpectralCatalog();
  const consumableDeps: ConsumableLabelDeps = {
    jokerCatalog,
    planetCatalog,
    tarotCatalog,
    deck: buildHeadlessDeck(),
  };
  let records = 0;

  for (let g = 0; g < config.games; g += 1) {
    const runSeed = config.seedOffset + g;
    const opts: RolloutOptions = {
      agent: handAgent,
      horizonAntes: config.horizon,
      rollouts: config.rollouts,
      maxAnte: 8,
      consumableDeps,
    };

    const shopAgent: HeadlessShopAgent = {
      async buyAfterRound(view: ShopView): Promise<ShopResult> {
        let jokers = [...view.jokers];
        let { money } = view;
        let { handStats } = view;
        const ownedIds = new Set(jokers.map((j) => j.id));
        const rollBase = runSeed * 1_000_003 + view.ante * 7919 + view.round * 31;
        let offers = [...pickShopOffers({ jokerCatalog, excludedJokerIds: [...ownedIds], planetCatalog, tarotCatalog, spectralCatalog, rng: view.rng })];

        for (let step = 0; step < 4; step += 1) {
          const state: PostShopState = { jokers, money, handStats };
          const pack = offers.find(
            (o) =>
              o.kind === "pack" &&
              o.price <= money &&
              (o.pack.pool === "buffoon" || o.pack.pool === "celestial"),
          );
          if (pack !== undefined && pack.kind === "pack") {
            const limit = packPickLimit(pack.pack.variant);
            const options = [...pack.pack.options];
            const skipValue = await rolloutValue(view.ante, state, opts, rollBase + step * 991);
            let bestIdx = -1;
            let bestVal = skipValue;
            for (let i = 0; i < options.length; i += 1) {
              const post = applyPackOption(options[i], state);
              if (post === null) continue;
              const value = await rolloutValue(view.ante, post, opts, rollBase + step * 991 + (i + 1) * 53);
              if (value > bestVal) { bestVal = value; bestIdx = i; }
            }
            sink(JSON.stringify({
              schemaVersion: RUN_EVENT_SCHEMA_VERSION, runSeed, ante: view.ante, round: view.round, blind: 0, money,
              kind: "pack-pick", pool: pack.pack.pool, variant: pack.pack.variant,
              options: options.map(packOptionSnapshot), pickedIndex: bestIdx < 0 ? null : bestIdx, picksRemaining: limit,
            }));
            records += 1;
            money -= pack.price;
            if (bestIdx >= 0) {
              const applied = applyPackOption(options[bestIdx], state);
              if (applied !== null) { jokers = [...applied.jokers]; handStats = applied.handStats; if (options[bestIdx].kind === "joker") ownedIds.add((options[bestIdx] as { joker: { id: string } }).joker.id); }
            }
            offers = offers.filter((o) => o !== pack);
            continue;
          }

          const choice = await bestShopChoice(view.ante, offers, state, opts, rollBase + step * 991);
          if (choice.index >= offers.length) break;
          const chosen = offers[choice.index];
          sink(JSON.stringify({
            schemaVersion: RUN_EVENT_SCHEMA_VERSION, runSeed, ante: view.ante, round: view.round, blind: 0, money,
            kind: "purchase", item: shopItemSnapshot(chosen), offers: offers.map(shopItemSnapshot),
          }));
          records += 1;
          const chosenRng = seededRng(rollBase + step * 991 + (choice.index + 1) * 92821);
          const post = applyOfferToState(chosen, state, consumableDeps, chosenRng);
          if (post === null) break;
          jokers = [...post.jokers]; money = post.money; handStats = post.handStats;
          for (const j of jokers) ownedIds.add(j.id);
          offers = offers.filter((_, i) => i !== choice.index);
        }

        return { jokers, money, handStats, ownedVoucherIds: view.ownedVoucherIds };
      },
    };

    await playHeadlessRun(handAgent, { seed: runSeed, maxAnte: 8, shopAgent });
  }
  return records;
}

if (isMain) {
  const outPath = process.argv[2];
  if (outPath === undefined || outPath.startsWith("--")) {
    console.error("Usage: yarn dlx tsx scripts/generateShopRolloutDataset.ts <out.jsonl> [--games N] [--seed-offset N] [--hand-model PATH] [--horizon N] [--rollouts N] [--parallel-jobs N]");
    process.exit(1);
  }
  const config: GenConfig = {
    games: intFlag("--games", 50),
    seedOffset: intFlag("--seed-offset", 0),
    handModel: stringFlag("--hand-model", "public/models/advisor-policy-v8.onnx"),
    horizon: intFlag("--horizon", 3),
    rollouts: intFlag("--rollouts", 2),
  };
  const parallelJobs = intFlag("--parallel-jobs", 1);

  if (parallelJobs > 1) {
    const evalIdx = process.execArgv.indexOf("--eval");
    const loaderArgs = evalIdx >= 0 ? process.execArgv.slice(0, evalIdx) : [...process.execArgv];
    const tmpDir = mkdtempSync(join(tmpdir(), "browslatro-shop-rollout-"));
    const slices = sliceJobs(config.games, config.seedOffset, parallelJobs);
    const started = Date.now();
    console.log(`spawning ${slices.length} parallel jobs ...`);
    let done = 0;
    await Promise.all(slices.map((slice, i) => {
      const tmpOut = join(tmpDir, `chunk-${i}.jsonl`);
      return new Promise<void>((res, rej) => {
        const args = [__filename, tmpOut, "--games", String(slice.games), "--seed-offset", String(slice.seedOffset),
          "--hand-model", config.handModel, "--horizon", String(config.horizon), "--rollouts", String(config.rollouts)];
        const proc = spawn(process.execPath, [...loaderArgs, ...args], { stdio: ["ignore", "ignore", "inherit"] });
        proc.on("close", (code) => { if (code === 0) { done += 1; process.stderr.write(`  ${done}/${slices.length} jobs done\n`); res(); } else rej(new Error(`job ${i} exited ${String(code)}`)); });
      });
    }));
    writeFileSync(outPath, "");
    let total = 0;
    for (let i = 0; i < slices.length; i += 1) {
      const content = readFileSync(join(tmpDir, `chunk-${i}.jsonl`), "utf8").trimEnd();
      if (content.length > 0) { total += content.split("\n").length; appendFileSync(outPath, `${content}\n`); }
    }
    rmSync(tmpDir, { recursive: true });
    console.log(`${total} records from ${config.games} games in ${((Date.now() - started) / 1000).toFixed(1)}s`);
  } else {
    const started = Date.now();
    writeFileSync(outPath, "");
    const count = await generate(config, (line) => appendFileSync(outPath, `${line}\n`));
    console.log(`${count} records from ${config.games} games in ${((Date.now() - started) / 1000).toFixed(1)}s`);
  }
}

export { generate };
