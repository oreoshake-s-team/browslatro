import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { intFlag } from "../generateDataset";
import { planShards, type RemoteShard } from "./shardPlan";
import {
  FlyMachinesClient,
  type MachineGuest,
  type MachineLauncher,
} from "./flyMachines";
import { waitForMachineTerminal } from "./machineWait";
import { runPreflight } from "./preflight";
import { resolveRunId } from "./runId";
import { getObject, putObject, s3ConfigFromEnv } from "./s3";

const SELFPLAY_EXEC = ["bash", "ml/remote/selfplay-entrypoint.sh"] as const;

export interface SelfPlayArgs {
  readonly shopModel: string;
  readonly handModel: string;
  readonly temperature: number;
  readonly hold: boolean;
  readonly parallelJobs: number;
}

export interface RemoteSelfPlayOptions {
  readonly runId: string;
  readonly totalGames: number;
  readonly machines: number;
  readonly seedOffset?: number;
  readonly keyPrefix?: string;
  readonly image: string;
  readonly guest: MachineGuest;
  readonly selfPlay: SelfPlayArgs;
  readonly workerEnv: Record<string, string>;
  readonly pollIntervalMs?: number;
  readonly maxWaitMs?: number;
}

export interface RemoteSelfPlayDeps {
  readonly launcher: MachineLauncher;
  readonly getShard: (key: string) => Promise<Buffer>;
  readonly sleep: (ms: number) => Promise<void>;
  readonly log?: (message: string) => void;
}

export interface RemoteSelfPlayResult {
  readonly shards: readonly RemoteShard[];
  readonly dataset: Buffer;
  readonly records: number;
}

export function selfPlayShardEnv(shard: RemoteShard, selfPlay: SelfPlayArgs): Record<string, string> {
  return {
    OUTPUT_KEY: shard.outputKey,
    GAMES: String(shard.games),
    SEED_OFFSET: String(shard.seedOffset),
    SHOP_MODEL: selfPlay.shopModel,
    HAND_MODEL: selfPlay.handModel,
    TEMPERATURE: String(selfPlay.temperature),
    HOLD: selfPlay.hold ? "1" : "0",
    PARALLEL_JOBS: String(selfPlay.parallelJobs),
  };
}

async function runShard(
  shard: RemoteShard,
  options: RemoteSelfPlayOptions,
  deps: RemoteSelfPlayDeps,
): Promise<Buffer> {
  const log = deps.log ?? (() => {});
  const handle = await deps.launcher.run({
    name: `${options.runId}-shard-${shard.index}`,
    image: options.image,
    env: { ...options.workerEnv, ...selfPlayShardEnv(shard, options.selfPlay) },
    guest: options.guest,
    exec: [...SELFPLAY_EXEC],
  });
  log(`shard ${shard.index}: launched machine ${handle.id} (${shard.games} games)`);

  try {
    await waitForMachineTerminal(handle.id, handle.state, `shard ${shard.index}`, {
      pollIntervalMs: options.pollIntervalMs ?? 5_000,
      maxWaitMs: options.maxWaitMs ?? 30 * 60_000,
      sleep: deps.sleep,
      get: deps.launcher.get.bind(deps.launcher),
    });
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

export async function runRemoteSelfPlay(
  options: RemoteSelfPlayOptions,
  deps: RemoteSelfPlayDeps,
): Promise<RemoteSelfPlayResult> {
  const shards = planShards({
    runId: options.runId,
    totalGames: options.totalGames,
    machines: options.machines,
    seedOffset: options.seedOffset,
    keyPrefix: options.keyPrefix ?? "selfplay",
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
      "Usage: yarn dlx tsx scripts/remote/runRemoteSelfPlay.ts <out.jsonl> [--run-id ID] --games N --machines N [--seed-offset N] [--shop-model PATH] [--hand-model PATH] [--temperature T] [--hold-consumables] [--parallel-jobs N] [--image IMG] [--cpus N] [--memory-mb N]",
    );
    process.exit(1);
  }

  const runId = resolveRunId(stringFlag("--run-id", ""));
  console.log(`run id: ${runId}`);
  const s3Config = s3ConfigFromEnv();
  const launcher = new FlyMachinesClient({
    app: requireEnv("FLY_APP"),
    token: requireEnv("FLY_API_TOKEN"),
  });

  const cpus = intFlag("--cpus", 2);
  const options: RemoteSelfPlayOptions = {
    runId,
    totalGames: intFlag("--games", 1000),
    machines: intFlag("--machines", 4),
    seedOffset: intFlag("--seed-offset", 0),
    image: stringFlag("--image", requireEnv("DATASET_IMAGE")),
    guest: {
      cpus: cpus,
      memoryMb: intFlag("--memory-mb", 2048),
      cpuKind: "shared",
    },
    selfPlay: {
      shopModel: stringFlag("--shop-model", "public/models/advisor-shop-policy-v9.onnx"),
      handModel: stringFlag("--hand-model", "public/models/advisor-policy-v9.onnx"),
      temperature: Number(stringFlag("--temperature", "1.0")),
      hold: process.argv.includes("--hold-consumables"),
      parallelJobs: intFlag("--parallel-jobs", cpus),
    },
    workerEnv: {
      AWS_ENDPOINT_URL_S3: s3Config.endpoint,
      AWS_REGION: s3Config.region,
      BROWSLATRO_DATASET_BUCKET: s3Config.bucket,
      AWS_ACCESS_KEY_ID: s3Config.accessKeyId,
      AWS_SECRET_ACCESS_KEY: s3Config.secretAccessKey,
    },
  };

  await runPreflight(options.runId, {
    putMarker: (key, body) => putObject(s3Config, key, body),
    checkFly: () => launcher.assertReachable(),
    log: (message) => console.log(message),
  });

  const started = Date.now();
  const result = await runRemoteSelfPlay(options, {
    launcher,
    getShard: (key) => getObject(s3Config, key),
    sleep,
    log: (message) => console.log(message),
  });
  writeFileSync(outPath, result.dataset);
  console.log(
    `${result.records} decisions from ${result.shards.length} shards in ${((Date.now() - started) / 1000).toFixed(1)}s`,
  );
  console.log(`wrote ${outPath}`);
}
