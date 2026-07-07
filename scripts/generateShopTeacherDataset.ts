import "./loadEnv";
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve as resolvePath } from "node:path";
import { fileURLToPath } from "node:url";

import { createGreedyAgent } from "../src/ai/agents";
import { categorizeShopItem } from "../src/ai/advisor/shopCategory";
import { shopItemAttributes } from "../src/ai/advisor/shopCandidateAttributes";
import { shopBuildSummary } from "../src/ai/advisor/shopEncoding";
import type { ShopAdviceCandidate, ShopAdviceItem } from "../src/ai/advisor/types";
import { loadPolicyRanker } from "../src/ai/policy";
import { createPolicyAgent } from "../src/ai/policyAgent";
import {
  playHeadlessRun,
  seededRng,
  type HeadlessAgent,
  type HeadlessShopAgent,
  type ShopResult,
  type ShopView,
} from "../src/ai/headlessRun";
import { RUN_EVENT_SCHEMA_VERSION } from "../src/ai/runEvents";
import type { PackOption } from "../src/items/packs";
import { rollPackOptions } from "../src/items/packs";
import { createJokerCatalog } from "../src/items/jokers";
import { applyPlanetUpgrade, createPlanetCatalog } from "../src/items/planets";
import { pickShopItemOffers, type ShopItem } from "../src/items/shop";
import {
  applyShopBuy,
  labelByRollout,
  scoreShopState,
  type RolloutConfig,
  type ShopForwardState,
} from "./shopRolloutExpert";
import { createShopTeacher, type ShopTeacherLabeler } from "./shopTeacher";
import { labelShopWithGate } from "./shopTeacherGate";
import { intFlag, sliceJobs } from "./generateDataset";
import { assertTrainingSeedRange } from "./seedSpaces";

function floatFlag(name: string, fallback: number): number {
  const index = process.argv.indexOf(name);
  if (index === -1 || index + 1 >= process.argv.length) return fallback;
  const value = Number.parseFloat(process.argv[index + 1]);
  return Number.isNaN(value) ? fallback : value;
}

type BuyableOffer = Extract<ShopItem, { kind: "joker" | "planet" }>;

const ROLLOUT: RolloutConfig = {
  agent: createGreedyAgent(),
  seeds: [1, 2, 3],
  maxRounds: 6,
};

const DEFAULT_MARGIN = 0.15;

function shopItemSnapshot(item: BuyableOffer): {
  readonly itemType: string;
  readonly category: string;
  readonly attributes: number[];
  readonly id: string;
  readonly name: string;
  readonly cost: number;
} {
  const category = categorizeShopItem(item);
  const attributes = shopItemAttributes(item);
  return item.kind === "joker"
    ? { itemType: "joker", category, attributes, id: item.joker.id, name: item.joker.name, cost: item.price }
    : { itemType: "planet", category, attributes, id: item.planet.id, name: item.planet.name, cost: item.price };
}

function shopAdviceItem(item: BuyableOffer): ShopAdviceItem {
  const category = categorizeShopItem(item);
  const attributes = shopItemAttributes(item);
  return item.kind === "joker"
    ? {
        itemType: "joker",
        category,
        attributes,
        id: item.joker.id,
        name: item.joker.name,
        description: item.joker.description,
        cost: item.price,
      }
    : {
        itemType: "planet",
        category,
        attributes,
        id: item.planet.id,
        name: item.planet.name,
        description: item.planet.description,
        cost: item.price,
      };
}

async function scoreCandidates(
  candidates: ReadonlyArray<ShopForwardState>,
  rollout: RolloutConfig,
): Promise<number[]> {
  const scores: number[] = [];
  for (const candidate of candidates) {
    scores.push(
      await scoreShopState(candidate, rollout.agent, rollout.seeds, rollout.maxRounds),
    );
  }
  return scores;
}

export interface ShopTeacherGeneratorConfig {
  readonly games: number;
  readonly seedOffset: number;
  readonly margin: number;
  readonly limit?: number;
}

export interface ShopTeacherGeneratorStats {
  teacherCalls: number;
}

export async function generateShopTeacherDecisions(
  config: ShopTeacherGeneratorConfig,
  teacher: ShopTeacherLabeler,
  stats?: ShopTeacherGeneratorStats,
  onProgress?: (gamesDone: number) => void,
  handAgent?: HeadlessAgent,
): Promise<string> {
  const jokerCatalog = createJokerCatalog().filter((j) => j.rarity !== "legendary");
  const planetCatalog = createPlanetCatalog();
  const hand = handAgent ?? createGreedyAgent();
  const limit = config.limit ?? 0;
  const lines: string[] = [];
  const countingTeacher: ShopTeacherLabeler = async (view, candidates) => {
    if (stats !== undefined) stats.teacherCalls += 1;
    return teacher(view, candidates);
  };
  const gatedTeacher: ShopTeacherLabeler = async (view, candidates) => {
    if (limit > 0 && stats !== undefined && stats.teacherCalls >= limit) return null;
    return countingTeacher(view, candidates);
  };

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
        const buildFields = () => {
          const build = shopBuildSummary({
            jokers: result.jokers,
            handStats: result.handStats,
            deck: view.deck,
            consumablesHeld: 0,
          });
          return {
            handLevels: build.handLevels,
            jokers: build.jokers,
            deckEnhancements: build.deckEnhancements,
            consumablesHeld: build.consumablesHeld,
          };
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
        const buyable = affordable
          .map(({ o, i }) => ({ o, i, next: applyShopBuy(result, o) }))
          .filter(
            (b): b is { o: BuyableOffer; i: number; next: ShopForwardState } =>
              b.next !== null,
          );
        if (buyable.length > 0) {
          const rolloutCandidates = [...buyable.map((b) => b.next), result];
          const teacherCandidates: ShopAdviceCandidate[] = [
            ...buyable.map(({ o }) => ({
              action: "buy" as const,
              item: shopAdviceItem(o),
            })),
            { action: "leave" as const },
          ];
          const scores = await scoreCandidates(rolloutCandidates, ROLLOUT);
          const { index: chosen, source } = await labelShopWithGate({
            scores,
            view,
            candidates: teacherCandidates,
            teacher: gatedTeacher,
            margin: config.margin,
          });
          const snapshots = offers.map(shopItemSnapshot);
          if (chosen < buyable.length) {
            const offerIdx = buyable[chosen].i;
            if (source === "teacher") {
              recorder.push(
                JSON.stringify({
                  ...envelope,
                  ...buildFields(),
                  kind: "purchase",
                  item: snapshots[offerIdx],
                  offers: snapshots,
                  teacherLabeled: true,
                }),
              );
            }
            result = buyable[chosen].next;
          } else if (source === "teacher") {
            recorder.push(
              JSON.stringify({
                ...envelope,
                ...buildFields(),
                kind: "purchase",
                item: null,
                offers: snapshots,
                teacherLabeled: true,
              }),
            );
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
    onProgress?.(g + 1);
  }

  return lines.join("\n");
}

const __filename = fileURLToPath(import.meta.url);
const isMain = !!process.argv[1] && resolvePath(process.argv[1]) === __filename;

if (isMain) {
  const outPath = process.argv[2];
  if (outPath === undefined || outPath.startsWith("--")) {
    console.error(
      "Usage: ANTHROPIC_API_KEY=… ADVISOR_MODEL=claude-sonnet-4-6 yarn dlx tsx scripts/generateShopTeacherDataset.ts <out.jsonl> [--games N] [--seed-offset N] [--margin 0.15] [--parallel-jobs N]",
    );
    process.exit(1);
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey === undefined || apiKey === "") {
    console.error("ANTHROPIC_API_KEY is required");
    process.exit(1);
  }

  const config: ShopTeacherGeneratorConfig = {
    games: intFlag("--games", 100),
    seedOffset: intFlag("--seed-offset", 0),
    margin: floatFlag("--margin", DEFAULT_MARGIN),
    limit: intFlag("--limit", 0),
  };
  assertTrainingSeedRange(config.seedOffset, config.games);
  const handModelIdx = process.argv.indexOf("--hand-model");
  const handModel = handModelIdx >= 0 ? process.argv[handModelIdx + 1] : "";
  const loadHandAgent = async (): Promise<HeadlessAgent | undefined> =>
    handModel === ""
      ? undefined
      : createPolicyAgent(await loadPolicyRanker(readFileSync(handModel)));
  const parallelJobs = intFlag("--parallel-jobs", 1);

  if (parallelJobs > 1) {
    const evalIdx = process.execArgv.indexOf("--eval");
    const loaderArgs =
      evalIdx >= 0 ? process.execArgv.slice(0, evalIdx) : [...process.execArgv];
    const tmpDir = mkdtempSync(join(tmpdir(), "browslatro-shop-teacher-ds-"));
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
            "--margin",
            String(config.margin),
            "--limit",
            String(config.limit ?? 0),
            ...(handModel === "" ? [] : ["--hand-model", handModel]),
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
    const stats = { teacherCalls: 0 };
    const teacher = createShopTeacher(apiKey);
    const progressEvery = 25;
    const onProgress = (gamesDone: number): void => {
      if (gamesDone % progressEvery !== 0 && gamesDone !== config.games) return;
      process.stderr.write(
        `  [seed ${config.seedOffset}] ${gamesDone}/${config.games} games, ` +
          `${stats.teacherCalls} teacher calls\n`,
      );
    };
    const handAgent = await loadHandAgent();
    const content = await generateShopTeacherDecisions(config, teacher, stats, onProgress, handAgent);
    writeFileSync(outPath, content.length > 0 ? `${content}\n` : "");
    const count = content.split("\n").filter(Boolean).length;
    console.log(
      `${count} records (${stats.teacherCalls} teacher-labeled) from ${config.games} games ` +
        `in ${((Date.now() - started) / 1000).toFixed(1)}s`,
    );
    console.log(`wrote ${outPath}`);
  }
}
