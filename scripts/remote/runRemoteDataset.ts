import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { intFlag } from "../generateDataset";
import { planShards, type RemoteShard } from "./shardPlan";
import {
  FlyMachinesClient,
  type MachineGuest,
  type MachineHandle,
  type MachineLauncher,
} from "./flyMachines";
import { getObject, s3ConfigFromEnv } from "./s3";

export interface GenerateArgs {
  readonly rollouts: number;
  readonly topN: number;
  readonly maxAnte: number;
  readonly deck: string;
  readonly stake: string;
  readonly jokerLoadoutFraction: number;
  readonly shopPolicy?: string;
}

export interface RemoteDatasetOptions {
  readonly runId: string;
  readonly totalGames: number;
  readonly machines: number;
  readonly seedOffset?: number;
  readonly keyPrefix?: string;
  readonly image: string;
  readonly guest: MachineGuest;
  readonly generate: GenerateArgs;
  readonly workerEnv: Record<string, string>;
  readonly pollIntervalMs?: number;
  readonly maxWaitMs?: number;
}

export interface RemoteDatasetDeps {
  readonly launcher: MachineLauncher;
  readonly getShard: (key: string) => Promise<Buffer>;
  readonly sleep: (ms: number) => Promise<void>;
  readonly log?: (message: string) => void;
}

export interface RemoteDatasetResult {
  readonly shards: readonly RemoteShard[];
  readonly dataset: Buffer;
  readonly records: number;
}

const TERMINAL_STATES = new Set(["stopped", "destroyed"]);

export function shardEnv(shard: RemoteShard, generate: GenerateArgs): Record<string, string> {
  const env: Record<string, string> = {
    OUTPUT_KEY: shard.outputKey,
    GAMES: String(shard.games),
    SEED_OFFSET: String(shard.seedOffset),
    ROLLOUTS: String(generate.rollouts),
    TOP_N: String(generate.topN),
    MAX_ANTE: String(generate.maxAnte),
    DECK: generate.deck,
    STAKE: generate.stake,
    JOKER_LOADOUT_FRACTION: String(generate.jokerLoadoutFraction),
  };
  if (generate.shopPolicy !== undefined && generate.shopPolicy !== "") {
    env.SHOP_POLICY = generate.shopPolicy;
  }
  return env;
}

async function waitForTerminal(
  shard: RemoteShard,
  handle: MachineHandle,
  options: RemoteDatasetOptions,
  deps: RemoteDatasetDeps,
): Promise<void> {
  const pollIntervalMs = options.pollIntervalMs ?? 5_000;
  const maxWaitMs = options.maxWaitMs ?? 30 * 60_000;
  let waited = 0;
  let state = handle.state;
  while (!TERMINAL_STATES.has(state)) {
    if (waited >= maxWaitMs) {
      throw new Error(
        `machine ${handle.id} for shard ${shard.index} did not finish within ${maxWaitMs}ms (last state "${state}")`,
      );
    }
    await deps.sleep(pollIntervalMs);
    waited += pollIntervalMs;
    state = (await deps.launcher.get(handle.id)).state;
  }
}

async function runShard(
  shard: RemoteShard,
  options: RemoteDatasetOptions,
  deps: RemoteDatasetDeps,
): Promise<Buffer> {
  const log = deps.log ?? (() => {});
  const handle = await deps.launcher.run({
    name: `${options.runId}-shard-${shard.index}`,
    image: options.image,
    env: { ...options.workerEnv, ...shardEnv(shard, options.generate) },
    guest: options.guest,
  });
  log(`shard ${shard.index}: launched machine ${handle.id} (${shard.games} games)`);

  try {
    await waitForTerminal(shard, handle, options, deps);
  } finally {
    await deps.launcher.destroy(handle.id);
  }

  const body = await deps.getShard(shard.outputKey);
  if (body.length === 0) {
    throw new Error(
      `shard ${shard.index} produced an empty object at ${shard.outputKey}; refusing to ship a partial dataset`,
    );
  }
  log(`shard ${shard.index}: collected ${body.length} bytes`);
  return body;
}

export async function runRemoteDataset(
  options: RemoteDatasetOptions,
  deps: RemoteDatasetDeps,
): Promise<RemoteDatasetResult> {
  const shards = planShards({
    runId: options.runId,
    totalGames: options.totalGames,
    machines: options.machines,
    seedOffset: options.seedOffset,
    keyPrefix: options.keyPrefix,
  });

  const bodies = await Promise.all(shards.map((shard) => runShard(shard, options, deps)));

  const parts: Buffer[] = [];
  let records = 0;
  for (const body of bodies) {
    const text = body.toString("utf8").trimEnd();
    if (text.length === 0) continue;
    records += text.split("\n").length;
    parts.push(Buffer.from(`${text}\n`));
  }

  return { shards, dataset: Buffer.concat(parts), records };
}

const __filename = fileURLToPath(import.meta.url);
const isMain = !!process.argv[1] && resolve(process.argv[1]) === __filename;

function stringFlag(name: string, fallback: string): string {
  const index = process.argv.indexOf(name);
  if (index === -1 || index + 1 >= process.argv.length) return fallback;
  return process.argv[index + 1];
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === "") throw new Error(`missing required env ${name}`);
  return value;
}

const sleep = (ms: number): Promise<void> => new Promise((res) => setTimeout(res, ms));

if (isMain) {
  const outPath = process.argv[2];
  if (outPath === undefined || outPath.startsWith("--")) {
    console.error(
      "Usage: yarn dlx tsx scripts/remote/runRemoteDataset.ts <out.jsonl> --run-id ID --games N --machines N [--seed-offset N] [--image IMG] [--cpus N] [--memory-mb N] [--rollouts N] [--top-n N] [--max-ante N] [--deck ID] [--stake ID] [--shop-policy PATH]",
    );
    process.exit(1);
  }

  const s3Config = s3ConfigFromEnv();
  const launcher = new FlyMachinesClient({
    app: requireEnv("FLY_APP"),
    token: requireEnv("FLY_API_TOKEN"),
  });

  const options: RemoteDatasetOptions = {
    runId: stringFlag("--run-id", ""),
    totalGames: intFlag("--games", 1000),
    machines: intFlag("--machines", 4),
    seedOffset: intFlag("--seed-offset", 0),
    image: stringFlag("--image", requireEnv("DATASET_IMAGE")),
    guest: {
      cpus: intFlag("--cpus", 4),
      memoryMb: intFlag("--memory-mb", 2048),
      cpuKind: "shared",
    },
    generate: {
      rollouts: intFlag("--rollouts", 4),
      topN: intFlag("--top-n", 3),
      maxAnte: intFlag("--max-ante", 8),
      deck: stringFlag("--deck", "red"),
      stake: stringFlag("--stake", "white"),
      jokerLoadoutFraction: 0,
      shopPolicy: stringFlag("--shop-policy", ""),
    },
    workerEnv: {
      AWS_ENDPOINT_URL_S3: s3Config.endpoint,
      AWS_REGION: s3Config.region,
      BROWSLATRO_DATASET_BUCKET: s3Config.bucket,
      AWS_ACCESS_KEY_ID: s3Config.accessKeyId,
      AWS_SECRET_ACCESS_KEY: s3Config.secretAccessKey,
    },
  };

  const started = Date.now();
  const result = await runRemoteDataset(options, {
    launcher,
    getShard: (key) => getObject(s3Config, key),
    sleep,
    log: (message) => console.log(message),
  });
  writeFileSync(outPath, result.dataset);
  console.log(
    `${result.records} records from ${result.shards.length} shards in ${((Date.now() - started) / 1000).toFixed(1)}s`,
  );
  console.log(`wrote ${outPath}`);
}
