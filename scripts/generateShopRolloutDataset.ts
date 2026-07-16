import { spawn } from "node:child_process";
import { HAND_MODEL_REPO_PATH } from "../src/ai/advisor/productionModels";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, appendFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve as resolvePath } from "node:path";
import { fileURLToPath } from "node:url";

import { createPolicyAgent } from "../src/ai/policyAgent";
import { loadPolicyRanker } from "../src/ai/policy";
import {
  playHeadlessRun,
  seededRng,
  type HeadlessShopAgent,
  type ShopResult,
  type ShopView,
} from "../src/ai/headlessRun";
import {
  bestHeldUse,
  bestShopChoiceHeld,
  buyOfferToHold,
  flushHeldConsumables,
  rolloutValue,
  applyHeldConsumable,
  type ConsumableLabelDeps,
  type RolloutOptions,
  type PostShopState,
} from "../src/ai/shopRolloutExpert";
import { categorizePackOption } from "../src/ai/advisor/shopCategory";
import { assertTrainingSeedRange } from "./seedSpaces";
import { packOptionAttributes } from "../src/ai/advisor/shopCandidateAttributes";
import {
  chosenCandidateIndex,
  shopCandidateRows,
  shopItemSnapshot,
  usedItemSnapshot,
} from "../src/ai/shopCandidateRows";
import { shopBuildSummary } from "../src/ai/advisor/shopEncoding";
import type { Joker } from "../src/items/jokers/types";
import type { HandStats } from "../src/scoring/handStats";
import type { Card } from "../src/cards/types";
import { createJokerStackingShopAgent } from "../src/ai/rolloutShopAgent";
import { createHeadlessShopAgent } from "../src/ai/headlessShopAgent";
import type { Consumable } from "../src/items/consumables";
import { RUN_EVENT_SCHEMA_VERSION } from "../src/ai/runEvents";
import { createJokerCatalog } from "../src/items/jokers";
import { createPlanetCatalog, applyPlanetUpgrade } from "../src/items/planets";
import { createTarotCatalog } from "../src/items/tarots";
import { createSpectralCatalog } from "../src/items/spectrals";
import { pickShopOffers, rerollAllowed, rerollCostFor } from "../src/items/shop";
import { packPickLimit, type PackOption } from "../src/items/packs";
import { MAX_JOKERS } from "../src/items/jokers/constants";
import { intFlag, sliceJobs } from "./generateDataset";

const __filename = fileURLToPath(import.meta.url);
const isMain = !!process.argv[1] && resolvePath(process.argv[1]) === __filename;

const MAX_REROLLS = 2;

function stringFlag(name: string, fallback: string): string {
  const index = process.argv.indexOf(name);
  if (index === -1 || index + 1 >= process.argv.length) return fallback;
  return process.argv[index + 1];
}

function packOptionSnapshot(opt: PackOption): { optionType: string; category: string; attributes: number[]; advancesHands?: ReadonlyArray<string>; id: string; name: string } {
  const category = categorizePackOption(opt);
  const attributes = packOptionAttributes(opt);
  if (opt.kind === "joker") return { optionType: "joker", category, attributes, id: opt.joker.id, name: opt.joker.name };
  if (opt.kind === "planet") return { optionType: "planet", category, attributes, advancesHands: opt.planet.hands, id: opt.planet.id, name: opt.planet.name };
  if (opt.kind === "tarot") return { optionType: "tarot", category, attributes, id: opt.tarot.id, name: opt.tarot.name };
  if (opt.kind === "spectral") return { optionType: "spectral", category, attributes, id: opt.spectral.id, name: opt.spectral.name };
  return { optionType: "playing-card", category, attributes, id: `${opt.card.rank}${opt.card.suit}`, name: `${opt.card.rank} of ${opt.card.suit}` };
}

function buildFields(
  jokers: ReadonlyArray<Joker>,
  handStats: HandStats,
  deck: ReadonlyArray<Card>,
  consumablesHeld: number,
): {
  handLevels: Readonly<Record<string, number>>;
  jokers: ReadonlyArray<{ effectKind: string; rarity: string }>;
  deckEnhancements: Readonly<Record<string, number>>;
  consumablesHeld: number;
} {
  const build = shopBuildSummary({ jokers, handStats, deck, consumablesHeld });
  return {
    handLevels: build.handLevels,
    jokers: build.jokers,
    deckEnhancements: build.deckEnhancements,
    consumablesHeld: build.consumablesHeld,
  };
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
  readonly rolloutShopModel: string;
  readonly winBonus: number;
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
  };
  const rolloutShopAgent =
    config.rolloutShopModel === ""
      ? createJokerStackingShopAgent()
      : await createHeadlessShopAgent(config.rolloutShopModel);
  let records = 0;

  for (let g = 0; g < config.games; g += 1) {
    const runSeed = config.seedOffset + g;
    const opts: RolloutOptions = {
      agent: handAgent,
      horizonAntes: config.horizon,
      rollouts: config.rollouts,
      maxAnte: 8,
      consumableDeps,
      rolloutShopAgent,
      winBonus: config.winBonus,
    };

    const shopAgent: HeadlessShopAgent = {
      async buyAfterRound(view: ShopView): Promise<ShopResult> {
        let jokers = [...view.jokers];
        let { money } = view;
        let { handStats } = view;
        let deck = view.deck;
        let held: ReadonlyArray<Consumable> = [];
        const ownedIds = new Set(jokers.map((j) => j.id));
        const rollBase = runSeed * 1_000_003 + view.ante * 7919 + view.round * 31;
        let offers = [...pickShopOffers({ jokerCatalog, excludedJokerIds: [...ownedIds], planetCatalog, tarotCatalog, spectralCatalog, rng: view.rng })];
        let rerollsDone = 0;

        const adoptState = (post: PostShopState): void => {
          jokers = [...post.jokers];
          money = post.money;
          handStats = post.handStats;
          deck = post.deck;
          held = post.consumables ?? [];
          for (const j of jokers) ownedIds.add(j.id);
        };

        const baseFields = (): Record<string, unknown> => ({
          schemaVersion: RUN_EVENT_SCHEMA_VERSION, runSeed, ante: view.ante, round: view.round, blind: 0, money,
          ...buildFields(jokers, handStats, deck, held.length),
        });

        for (let step = 0; step < 4; step += 1) {
          const state: PostShopState = { jokers, money, handStats, deck, consumables: held };
          const pack = offers.find(
            (o) =>
              o.kind === "pack" &&
              o.price <= money &&
              (o.pack.pool === "buffoon" || o.pack.pool === "celestial"),
          );
          if (pack !== undefined && pack.kind === "pack") {
            const limit = packPickLimit(pack.pack.variant);
            const options = [...pack.pack.options];
            const skipValue = await rolloutValue(view.ante, flushHeldConsumables(state, consumableDeps, seededRng(rollBase + step * 991 + 13)), opts, rollBase + step * 991);
            let bestIdx = -1;
            let bestVal = skipValue;
            for (let i = 0; i < options.length; i += 1) {
              const post = applyPackOption(options[i], state);
              if (post === null) continue;
              const value = await rolloutValue(view.ante, flushHeldConsumables(post, consumableDeps, seededRng(rollBase + step * 991 + (i + 1) * 53 + 1)), opts, rollBase + step * 991 + (i + 1) * 53);
              if (value > bestVal) { bestVal = value; bestIdx = i; }
            }
            sink(JSON.stringify({
              ...baseFields(),
              kind: "pack-pick", pool: pack.pack.pool, variant: pack.pack.variant,
              options: options.map(packOptionSnapshot), pickedIndex: bestIdx < 0 ? null : bestIdx, picksRemaining: limit,
            }));
            records += 1;
            money -= pack.price;
            if (bestIdx >= 0) {
              const applied = applyPackOption(options[bestIdx], state);
              if (applied !== null) { jokers = [...applied.jokers]; handStats = applied.handStats; deck = applied.deck; if (options[bestIdx].kind === "joker") ownedIds.add((options[bestIdx] as { joker: { id: string } }).joker.id); }
            }
            offers = offers.filter((o) => o !== pack);
            continue;
          }

          const choice = await bestShopChoiceHeld(view.ante, offers, state, opts, rollBase + step * 991);

          const rerollCost = rerollCostFor(rerollsDone);
          const rerollAvailable =
            rerollsDone < MAX_REROLLS && rerollCost <= money && offers.length > 0 && rerollAllowed(money, view.ownedVoucherIds, ownedIds);
          const candidates = shopCandidateRows(offers, held, rerollAvailable ? rerollCost : null);

          if (rerollAvailable) {
            const rerolledOffers = [...pickShopOffers({ jokerCatalog, excludedJokerIds: [...ownedIds], planetCatalog, tarotCatalog, spectralCatalog, rng: view.rng })];
            const rerolledState: PostShopState = { jokers, money: money - rerollCost, handStats, deck, consumables: held };
            const rerolledChoice = await bestShopChoiceHeld(view.ante, rerolledOffers, rerolledState, opts, rollBase + step * 991 + 7);
            if (rerolledChoice.bestValue > choice.bestValue) {
              sink(JSON.stringify({
                ...baseFields(),
                kind: "reroll", cost: rerollCost, offers: offers.map(shopItemSnapshot),
                candidates, chosenIndex: chosenCandidateIndex(offers.length, held.length, true, { kind: "reroll" }),
              }));
              records += 1;
              money -= rerollCost;
              offers = rerolledOffers;
              rerollsDone += 1;
              continue;
            }
          }

          if (choice.bestUse >= 0) {
            const consumable = held[choice.bestUse];
            sink(JSON.stringify({
              ...baseFields(),
              kind: "use", item: usedItemSnapshot(consumable, choice.bestUse), offers: offers.map(shopItemSnapshot),
              candidates, chosenIndex: chosenCandidateIndex(offers.length, held.length, rerollAvailable, { kind: "use", index: choice.bestUse }),
            }));
            records += 1;
            const post = applyHeldConsumable(choice.bestUse, state, consumableDeps, seededRng(rollBase + step * 991 + 41));
            if (post === null) break;
            adoptState(post);
            continue;
          }

          if (choice.bestOffer < 0) {
            if (offers.some((o) => o.price <= money) || held.length > 0) {
              sink(JSON.stringify({
                ...baseFields(),
                kind: "purchase", item: null, offers: offers.map(shopItemSnapshot),
                candidates, chosenIndex: chosenCandidateIndex(offers.length, held.length, rerollAvailable, { kind: "leave" }),
              }));
              records += 1;
            }
            break;
          }
          const chosen = offers[choice.bestOffer];
          sink(JSON.stringify({
            ...baseFields(),
            kind: "purchase", item: shopItemSnapshot(chosen), offers: offers.map(shopItemSnapshot),
            candidates, chosenIndex: chosenCandidateIndex(offers.length, held.length, rerollAvailable, { kind: "buy", index: choice.bestOffer }),
          }));
          records += 1;
          const chosenRng = seededRng(rollBase + step * 991 + (choice.bestOffer + 1) * 92821);
          const post = buyOfferToHold(chosen, state, consumableDeps, chosenRng);
          if (post === null) break;
          adoptState(post);
          offers = offers.filter((_, i) => i !== choice.bestOffer);
        }

        while (held.length > 0) {
          const state: PostShopState = { jokers, money, handStats, deck, consumables: held };
          const seedBase = rollBase + 7717 * (held.length + 1);
          const bestUse = await bestHeldUse(view.ante, state, opts, seedBase);
          const candidates = shopCandidateRows([], held, null);
          sink(JSON.stringify({
            ...baseFields(),
            kind: "use", item: usedItemSnapshot(held[bestUse], bestUse), offers: [],
            candidates, chosenIndex: chosenCandidateIndex(0, held.length, false, { kind: "use", index: bestUse }),
          }));
          records += 1;
          const post = applyHeldConsumable(bestUse, state, consumableDeps, seededRng(seedBase + 3));
          if (post === null) {
            held = held.filter((_, i) => i !== bestUse);
            continue;
          }
          adoptState(post);
        }

        return { jokers, money, handStats, deck, ownedVoucherIds: view.ownedVoucherIds };
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
    handModel: stringFlag("--hand-model", HAND_MODEL_REPO_PATH),
    horizon: intFlag("--horizon", 8),
    rollouts: intFlag("--rollouts", 2),
    rolloutShopModel: stringFlag("--rollout-shop-model", ""),
    winBonus: intFlag("--win-bonus", 0),
  };
  assertTrainingSeedRange(config.seedOffset, config.games);
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
          "--hand-model", config.handModel, "--horizon", String(config.horizon), "--rollouts", String(config.rollouts),
          "--win-bonus", String(config.winBonus),
          ...(config.rolloutShopModel === "" ? [] : ["--rollout-shop-model", config.rolloutShopModel])];
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
