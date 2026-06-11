import type { Blind } from "../cards/types";
import type { Joker } from "../items/jokers/types";
import { getHandOptions, type HandOption } from "./getHandOptions";
import {
  playHeadlessRun,
  seededRng,
  type AgentAction,
  type HeadlessAgent,
  type HeadlessRunResult,
} from "./headlessRun";
import { toModelState, type ModelState } from "./modelState";
import { createSearchAgent } from "./searchAgent";

export const DATASET_SCHEMA_VERSION = 1;

export interface DatasetRecord {
  readonly schemaVersion: typeof DATASET_SCHEMA_VERSION;
  readonly runSeed: number;
  readonly ante: number;
  readonly blind: Blind;
  readonly state: ModelState;
  readonly candidates: ReadonlyArray<HandOption>;
  readonly chosenIndex: number;
  readonly chosenAction: AgentAction;
}

export interface GenerateDatasetConfig {
  readonly games: number;
  readonly seedOffset?: number;
  readonly rollouts?: number;
  readonly topN?: number;
  readonly maxAnte?: number;
  readonly jokers?: ReadonlyArray<Joker>;
}

export interface GenerateDatasetResult {
  readonly records: ReadonlyArray<DatasetRecord>;
  readonly runs: ReadonlyArray<HeadlessRunResult>;
}

function sameAction(option: HandOption, action: AgentAction): boolean {
  const optionKind = option.action === "play" ? "play" : "discard";
  if (optionKind !== action.kind) return false;
  if (option.cardIds.length !== action.cardIds.length) return false;
  return option.cardIds.every((id, i) => id === action.cardIds[i]);
}

export async function generateDataset(
  config: GenerateDatasetConfig,
): Promise<GenerateDatasetResult> {
  if (config.games <= 0) {
    throw new Error(`games must be positive, got ${config.games}`);
  }
  const seedOffset = config.seedOffset ?? 0;
  const topN = config.topN ?? 3;
  const records: DatasetRecord[] = [];
  const runs: HeadlessRunResult[] = [];
  for (let game = 0; game < config.games; game += 1) {
    const seed = seedOffset + game;
    const expert = createSearchAgent({
      rng: seededRng(seed),
      rollouts: config.rollouts,
      topN,
    });
    const recorder: HeadlessAgent = {
      name: "recorder",
      async chooseAction(view) {
        const candidates = getHandOptions(view, topN);
        const action = await expert.chooseAction(view);
        records.push({
          schemaVersion: DATASET_SCHEMA_VERSION,
          runSeed: seed,
          ante: view.ante,
          blind: view.blind,
          state: toModelState(view),
          candidates,
          chosenIndex: candidates.findIndex((c) => sameAction(c, action)),
          chosenAction: action,
        });
        return action;
      },
    };
    runs.push(
      await playHeadlessRun(recorder, {
        seed,
        maxAnte: config.maxAnte,
        jokers: config.jokers,
      }),
    );
  }
  return { records, runs };
}

export function serializeDatasetRecords(
  records: ReadonlyArray<DatasetRecord>,
): string {
  return records.map((record) => JSON.stringify(record)).join("\n");
}
