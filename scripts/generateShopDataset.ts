import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve as resolvePath } from "node:path";
import { fileURLToPath } from "node:url";

import { seededRng } from "../src/ai/headlessRun";
import { RUN_EVENT_SCHEMA_VERSION } from "../src/ai/runEvents";
import type { PackOptionSnapshot } from "../src/ai/runEvents";
import type { PackOption } from "../src/items/packs";
import { rollPackOptions, packPickLimit } from "../src/items/packs";
import { MAX_JOKERS } from "../src/items/jokers/constants";
import { createJokerCatalog, pickRandomFromCatalog } from "../src/items/jokers";
import { jokerOfferPrice, BASE_REROLL_COST, SHOP_OFFER_SLOTS } from "../src/items/shop";
import { createPlanetCatalog } from "../src/items/planets";
import { intFlag, sliceJobs } from "./generateDataset";

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

export function generateShopDecisions(config: ShopGeneratorConfig): string {
  const jokerCatalog = createJokerCatalog();
  const planetCatalog = createPlanetCatalog();
  const lines: string[] = [];

  for (let g = 0; g < config.games; g += 1) {
    const seed = config.seedOffset + g;
    const rng = seededRng(seed);

    const ante = 1 + Math.floor(rng() * 8);
    const round = (ante - 1) * 3;
    const money = 2 + Math.floor(rng() * 19);
    const jokerCount = Math.floor(rng() * (MAX_JOKERS + 1));

    const envelope = {
      schemaVersion: RUN_EVENT_SCHEMA_VERSION,
      runSeed: seed,
      ante,
      round,
      blind: 0,
      money,
    };

    const picked = new Set<string>();
    const offers: Array<{ itemType: string; id: string; name: string; cost: number }> = [];
    for (let slot = 0; slot < SHOP_OFFER_SLOTS; slot += 1) {
      const joker = pickRandomFromCatalog(jokerCatalog, (j) => !picked.has(j.id), rng);
      if (joker !== null) {
        const cost = jokerOfferPrice(joker);
        offers.push({ itemType: "joker", id: joker.id, name: joker.name, cost });
        picked.add(joker.id);
      }
    }

    const affordable = offers.find((o) => o.cost <= money);
    if (affordable !== undefined && jokerCount < MAX_JOKERS) {
      lines.push(JSON.stringify({ ...envelope, kind: "purchase", item: affordable, offers }));
    } else if (money >= BASE_REROLL_COST) {
      lines.push(JSON.stringify({ ...envelope, kind: "reroll", cost: BASE_REROLL_COST, offers }));
    }

    const packRng = seededRng(seed + 1_000_000);
    const options = rollPackOptions({
      pool: "celestial",
      variant: "normal",
      planetCatalog,
      tarotCatalog: [],
      jokerCatalog,
      spectralCatalog: [],
      rng: packRng,
    });
    const snapshots = options.map(packOptionSnapshot);
    if (snapshots.length > 0) {
      lines.push(
        JSON.stringify({
          ...envelope,
          kind: "pack-pick",
          pool: "celestial",
          variant: "normal",
          options: snapshots,
          pickedIndex: 0,
          picksRemaining: packPickLimit("normal"),
        }),
      );
    }
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
    const content = generateShopDecisions(config);
    writeFileSync(outPath, content.length > 0 ? `${content}\n` : "");
    const count = content.split("\n").filter(Boolean).length;
    console.log(
      `${count} records from ${config.games} games in ${((Date.now() - started) / 1000).toFixed(1)}s`,
    );
    console.log(`wrote ${outPath}`);
  }
}
