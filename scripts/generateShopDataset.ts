import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve as resolvePath } from "node:path";
import { fileURLToPath } from "node:url";

import { createGreedyAgent } from "../src/ai/agents";
import {
  playHeadlessRun,
  seededRng,
  type HeadlessShopAgent,
  type ShopResult,
  type ShopView,
} from "../src/ai/headlessRun";
import { RUN_EVENT_SCHEMA_VERSION } from "../src/ai/runEvents";
import type { PackOptionSnapshot } from "../src/ai/runEvents";
import type { PackOption } from "../src/items/packs";
import { rollPackOptions, packPickLimit } from "../src/items/packs";
import { createJokerCatalog } from "../src/items/jokers";
import { applyPlanetUpgrade, createPlanetCatalog } from "../src/items/planets";
import { pickShopItemOffers, type ShopItem } from "../src/items/shop";
import {
  applyShopBuy,
  labelByRollout,
  type RolloutConfig,
  type ShopForwardState,
} from "./shopRolloutExpert";
import { intFlag, sliceJobs } from "./generateDataset";
import { assertTrainingSeedRange } from "./seedSpaces";

type BuyableOffer = Extract<ShopItem, { kind: "joker" | "planet" }>;

const ROLLOUT: RolloutConfig = {
  agent: createGreedyAgent(),
  seeds: [1, 2],
  maxRounds: 3,
};

function shopItemSnapshot(item: BuyableOffer): {
  readonly itemType: string;
  readonly id: string;
  readonly name: string;
  readonly cost: number;
} {
  return item.kind === "joker"
    ? { itemType: "joker", id: item.joker.id, name: item.joker.name, cost: item.price }
    : { itemType: "planet", id: item.planet.id, name: item.planet.name, cost: item.price };
}

const __filename = fileURLToPath(import.meta.url);
const isMain = !!process.argv[1] && resolvePath(process.argv[1]) === __filename;

function packOptionSnapshot(opt: PackOption): PackOptionSnapshot {
  switch (opt.kind) {
    case "planet":
      return { optionType: "planet", id: opt.planet.id, name: opt.planet.name };
    case "tarot":
      return { optionType: "tarot", id: opt.tarot.id, name: opt.tarot.name };
    case "joker":
      return { optionType: "joker", id: opt.joker.id, name: opt.joker.name };
    case "spectral":
      return { optionType: "spectral", id: opt.spectral.id, name: opt.spectral.name };
    case "playing-card":
      return {
        optionType: "playing-card",
        id: `${opt.card.rank}${opt.card.suit}`,
        name: `${opt.card.rank} of ${opt.card.suit}`,
      };
  }
}

export interface ShopGeneratorConfig {
  readonly games: number;
  readonly seedOffset: number;
}

export async function generateShopDecisions(
  config: ShopGeneratorConfig,
): Promise<string> {
  const jokerCatalog = createJokerCatalog().filter((j) => j.rarity !== "legendary");
  const planetCatalog = createPlanetCatalog();
  const hand = createGreedyAgent();
  const lines: string[] = [];

  for (let g = 0; g < config.games; g += 1) {
    const seed = config.seedOffset + g;
    const recorder: string[] = [];

    const shopAgent: HeadlessShopAgent = {
      async buyAfterRound(view: ShopView): Promise<ShopResult> {
        const envelope = {
          schemaVersion: RUN_EVENT_SCHEMA_VERSION,
          runSeed: seed,
          ante: view.ante,
          round: view.round,
          blind: 0,
          money: view.money,
        };
        let result: ShopForwardState = {
          ante: view.ante,
          jokers: view.jokers,
          handStats: view.handStats,
          money: view.money,
        };

        const offers = pickShopItemOffers({
          jokerCatalog,
          excludedJokerIds: view.jokers.map((j) => j.id),
          planetCatalog,
          tarotCatalog: [],
          spectralCatalog: [],
          rng: view.rng,
        }).filter(
          (o): o is BuyableOffer => o.kind === "joker" || o.kind === "planet",
        );
        const affordable = offers
          .map((o, i) => ({ o, i }))
          .filter(({ o }) => o.price <= result.money);
        if (affordable.length > 0) {
          const candidates = [
            ...affordable.map(({ o }) => applyShopBuy(result, o)),
            result,
          ];
          const chosen = await labelByRollout(candidates, ROLLOUT);
          if (chosen < affordable.length) {
            const offerIdx = affordable[chosen].i;
            const snapshots = offers.map(shopItemSnapshot);
            recorder.push(
              JSON.stringify({
                ...envelope,
                kind: "purchase",
                item: snapshots[offerIdx],
                offers: snapshots,
              }),
            );
            result = applyShopBuy(result, offers[offerIdx]);
          }
        }

        const packRng = seededRng(seed * 1000 + view.round);
        const options = rollPackOptions({
          pool: "celestial",
          variant: "normal",
          planetCatalog,
          tarotCatalog: [],
          jokerCatalog,
          spectralCatalog: [],
          rng: packRng,
        }).filter((o): o is Extract<PackOption, { kind: "planet" }> => o.kind === "planet");
        if (options.length > 0) {
          const candidates = [
            ...options.map((o) => ({
              ...result,
              handStats: applyPlanetUpgrade(result.handStats, o.planet),
            })),
            result,
          ];
          const chosen = await labelByRollout(candidates, ROLLOUT);
          const pickedIndex = chosen < options.length ? chosen : null;
          recorder.push(
            JSON.stringify({
              ...envelope,
              kind: "pack-pick",
              pool: "celestial",
              variant: "normal",
              options: options.map(packOptionSnapshot),
              pickedIndex,
              picksRemaining: packPickLimit("normal"),
            }),
          );
          if (pickedIndex !== null) {
            result = {
              ...result,
              handStats: applyPlanetUpgrade(result.handStats, options[pickedIndex].planet),
            };
          }
        }

        return { jokers: result.jokers, money: result.money, handStats: result.handStats };
      },
    };

    await playHeadlessRun(hand, { seed, shopAgent });
    lines.push(...recorder);
  }

  return lines.join("\n");
}

if (isMain) {
  const outPath = process.argv[2];
  if (outPath === undefined || outPath.startsWith("--")) {
    console.error(
      "Usage: yarn dlx tsx scripts/generateShopDataset.ts <out.jsonl> [--games N] [--seed-offset N] [--parallel-jobs N]",
    );
    process.exit(1);
  }

  const config: ShopGeneratorConfig = {
    games: intFlag("--games", 100),
    seedOffset: intFlag("--seed-offset", 0),
  };
  assertTrainingSeedRange(config.seedOffset, config.games);
  const parallelJobs = intFlag("--parallel-jobs", 1);

  if (parallelJobs > 1) {
    const evalIdx = process.execArgv.indexOf("--eval");
    const loaderArgs =
      evalIdx >= 0 ? process.execArgv.slice(0, evalIdx) : [...process.execArgv];
    const tmpDir = mkdtempSync(join(tmpdir(), "browslatro-shop-ds-"));
    const slices = sliceJobs(config.games, config.seedOffset, parallelJobs);
    const started = Date.now();
    console.log(`spawning ${slices.length} parallel jobs ...`);

    let done = 0;
    await Promise.all(
      slices.map((slice, i) => {
        const tmpOut = join(tmpDir, `chunk-${i}.jsonl`);
        return new Promise<void>((res, rej) => {
          const args = [
            __filename,
            tmpOut,
            "--games",
            String(slice.games),
            "--seed-offset",
            String(slice.seedOffset),
          ];
          const proc = spawn(process.execPath, [...loaderArgs, ...args], {
            stdio: ["ignore", "ignore", "inherit"],
          });
          proc.on("close", (code) => {
            if (code === 0) {
              done += 1;
              process.stderr.write(`  ${done}/${slices.length} jobs done\n`);
              res();
            } else {
              rej(
                new Error(
                  `job ${i} (seed-offset ${slice.seedOffset}) exited ${String(code)}`,
                ),
              );
            }
          });
        });
      }),
    );

    let totalRecords = 0;
    const parts: string[] = [];
    for (let i = 0; i < slices.length; i += 1) {
      const content = readFileSync(join(tmpDir, `chunk-${i}.jsonl`), "utf8").trimEnd();
      if (content.length > 0) {
        totalRecords += content.split("\n").length;
        parts.push(content);
      }
    }
    writeFileSync(outPath, `${parts.join("\n")}\n`);
    rmSync(tmpDir, { recursive: true });
    console.log(
      `${totalRecords} records from ${config.games} games in ${((Date.now() - started) / 1000).toFixed(1)}s`,
    );
    console.log(`wrote ${outPath}`);
  } else {
    const started = Date.now();
    const content = await generateShopDecisions(config);
    writeFileSync(outPath, content.length > 0 ? `${content}\n` : "");
    const count = content.split("\n").filter(Boolean).length;
    console.log(
      `${count} records from ${config.games} games in ${((Date.now() - started) / 1000).toFixed(1)}s`,
    );
    console.log(`wrote ${outPath}`);
  }
}
