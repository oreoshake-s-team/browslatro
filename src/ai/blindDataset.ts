import { createJokerCatalog } from "../items/jokers/catalog";
import { MAX_JOKERS } from "../items/jokers/constants";
import type { Joker } from "../items/jokers/types";
import {
  playHeadlessRun,
  seededRng,
  type HeadlessAgent,
  type HeadlessRunResult,
} from "./headlessRun";
import { estimateWinnable, greedyAction } from "./searchAgent";

export const BLIND_DATASET_SCHEMA_VERSION = 1;

const BLIND_KIND_BY_INDEX: Record<number, string> = {
  1: "small",
  2: "big",
  3: "boss",
};
const BLIND_CLEAR_REWARD_BASE = 2;

export interface BlindDecisionRecord {
  readonly kind: string;
  readonly schemaVersion: typeof BLIND_DATASET_SCHEMA_VERSION;
  readonly runSeed: number;
  readonly ante: number;
  readonly scoreTarget: number;
  readonly payout: number;
  readonly money: number;
  readonly jokerCount: number;
  readonly consumableCount: number;
  readonly candidates: ReadonlyArray<
    { readonly action: "play" } | { readonly action: "skip" }
  >;
  readonly chosenIndex: number;
}

export interface GenerateBlindDatasetConfig {
  readonly games: number;
  readonly seedOffset?: number;
  readonly winnableRollouts?: number;
  readonly maxAnte?: number;
  readonly jokerLoadoutFraction?: number;
}

export interface GenerateBlindDatasetResult {
  readonly records: ReadonlyArray<BlindDecisionRecord>;
  readonly runs: ReadonlyArray<HeadlessRunResult>;
}

function rollLoadout(
  catalog: ReadonlyArray<Joker>,
  rng: () => number,
): ReadonlyArray<Joker> {
  const count = 1 + Math.floor(rng() * MAX_JOKERS);
  const remaining = catalog.filter((j) => j.rarity !== "legendary");
  const equipped: Joker[] = [];
  for (let j = 0; j < count && remaining.length > 0; j += 1) {
    const idx = Math.floor(rng() * remaining.length);
    equipped.push(remaining.splice(idx, 1)[0]);
  }
  return equipped;
}

export async function generateBlindDataset(
  config: GenerateBlindDatasetConfig,
): Promise<GenerateBlindDatasetResult> {
  if (config.games <= 0) {
    throw new Error(`games must be positive, got ${config.games}`);
  }
  const seedOffset = config.seedOffset ?? 0;
  const winnableRollouts = config.winnableRollouts ?? 8;
  const jokerLoadoutFraction = config.jokerLoadoutFraction ?? 0.6;
  const jokerCatalog = jokerLoadoutFraction > 0 ? createJokerCatalog() : null;
  const records: BlindDecisionRecord[] = [];
  const runs: HeadlessRunResult[] = [];

  for (let game = 0; game < config.games; game += 1) {
    const seed = seedOffset + game;
    let gameJokers: ReadonlyArray<Joker> | undefined;
    if (jokerCatalog !== null) {
      const loadoutRng = seededRng(seed + 1_000_000);
      if (loadoutRng() < jokerLoadoutFraction) {
        gameJokers = rollLoadout(jokerCatalog, loadoutRng);
      }
    }
    const winRng = seededRng(seed + 0x5151);
    const recorder: HeadlessAgent = {
      name: "blind-recorder",
      chooseAction(view) {
        if (view.offeredTag !== null) {
          const winnable = estimateWinnable(view, winRng, winnableRollouts);
          records.push({
            kind: BLIND_KIND_BY_INDEX[view.blind],
            schemaVersion: BLIND_DATASET_SCHEMA_VERSION,
            runSeed: seed,
            ante: view.ante,
            scoreTarget: view.scoreTarget,
            payout: view.blind + BLIND_CLEAR_REWARD_BASE,
            money: view.money,
            jokerCount: view.jokers.length,
            consumableCount: view.consumables.length,
            candidates: [{ action: "play" }, { action: "skip" }],
            chosenIndex: winnable ? 0 : 1,
          });
          if (!winnable) return { kind: "skip" };
        }
        return (
          greedyAction(view) ?? { kind: "play", cardIds: [view.dealt.hand[0].id] }
        );
      },
    };
    runs.push(
      await playHeadlessRun(recorder, {
        seed,
        maxAnte: config.maxAnte,
        jokers: gameJokers,
      }),
    );
  }
  return { records, runs };
}

export function serializeBlindRecords(
  records: ReadonlyArray<BlindDecisionRecord>,
): string {
  return records.map((record) => JSON.stringify(record)).join("\n");
}
