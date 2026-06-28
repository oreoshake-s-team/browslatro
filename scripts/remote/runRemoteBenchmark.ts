import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { intFlag } from "../generateDataset";
import { DEFAULT_DECK } from "../../src/items/decks";
import { DEFAULT_STAKE } from "../../src/items/stakes";
import {
  FlyMachinesClient,
  type MachineGuest,
  type MachineLauncher,
} from "./flyMachines";
import { waitForMachineTerminal } from "./machineWait";
import { runPreflight } from "./preflight";
import { resolveRunId } from "./runId";
import { getObject, putObject, s3ConfigFromEnv } from "./s3";

const BENCHMARK_EXEC = ["bash", "ml/remote/benchmark-entrypoint.sh"] as const;

export interface BenchmarkArgs {
  readonly games: number;
  readonly seedOffset: number;
  readonly deck: string;
  readonly stake: string;
  readonly shop: boolean;
  readonly baseline?: string;
}

export interface RemoteBenchmarkOptions {
  readonly runId: string;
  readonly modelKey: string;
  readonly outputKey: string;
  readonly image: string;
  readonly guest: MachineGuest;
  readonly benchmark: BenchmarkArgs;
  readonly workerEnv: Record<string, string>;
  readonly pollIntervalMs?: number;
  readonly maxWaitMs?: number;
}

export interface RemoteBenchmarkDeps {
  readonly launcher: MachineLauncher;
  readonly getArtifact: (key: string) => Promise<Buffer>;
  readonly sleep: (ms: number) => Promise<void>;
  readonly log?: (message: string) => void;
}

export interface AgentSummary {
  readonly label: string;
  readonly winRate: number;
  readonly averageBlindsCleared: number;
  readonly games: number;
  readonly wins: number;
}

export interface BenchmarkSummary {
  readonly games: number;
  readonly seedOffset: number;
  readonly deck: string;
  readonly stake: string;
  readonly agents: readonly AgentSummary[];
}

export function benchmarkEnv(
  modelKey: string,
  outputKey: string,
  benchmark: BenchmarkArgs,
): Record<string, string> {
  const env: Record<string, string> = {
    MODEL_KEY: modelKey,
    OUTPUT_KEY: outputKey,
    GAMES: String(benchmark.games),
    SEED_OFFSET: String(benchmark.seedOffset),
    DECK: benchmark.deck,
    STAKE: benchmark.stake,
    SHOP: benchmark.shop ? "1" : "0",
  };
  if (benchmark.baseline !== undefined && benchmark.baseline !== "") {
    env.BASELINE = benchmark.baseline;
  }
  return env;
}

function asNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(`benchmark result is missing a numeric "${field}"`);
  }
  return value;
}

export function parseBenchmark(raw: Buffer): BenchmarkSummary {
  if (raw.length === 0) {
    throw new Error("benchmark produced an empty object; the run did not report metrics");
  }
  const parsed = JSON.parse(raw.toString("utf8")) as Record<string, unknown>;
  const agents = parsed.agents;
  if (!Array.isArray(agents) || agents.length === 0) {
    throw new Error("benchmark result has no agents");
  }
  return {
    games: asNumber(parsed.games, "games"),
    seedOffset: asNumber(parsed.seedOffset, "seedOffset"),
    deck: String(parsed.deck),
    stake: String(parsed.stake),
    agents: agents.map((entry: Record<string, unknown>) => {
      const result = entry.result as Record<string, unknown>;
      return {
        label: String(entry.label),
        winRate: asNumber(result.winRate, "winRate"),
        averageBlindsCleared: asNumber(result.averageBlindsCleared, "averageBlindsCleared"),
        games: asNumber(result.games, "games"),
        wins: asNumber(result.wins, "wins"),
      };
    }),
  };
}

export async function runRemoteBenchmark(
  options: RemoteBenchmarkOptions,
  deps: RemoteBenchmarkDeps,
): Promise<BenchmarkSummary> {
  const log = deps.log ?? (() => {});
  const handle = await deps.launcher.run({
    name: `${options.runId}-benchmark`,
    image: options.image,
    env: { ...options.workerEnv, ...benchmarkEnv(options.modelKey, options.outputKey, options.benchmark) },
    guest: options.guest,
    exec: [...BENCHMARK_EXEC],
  });
  log(`benchmark: launched machine ${handle.id} on ${options.modelKey}`);

  try {
    await waitForMachineTerminal(handle.id, handle.state, "benchmark", {
      pollIntervalMs: options.pollIntervalMs ?? 10_000,
      maxWaitMs: options.maxWaitMs ?? 60 * 60_000,
      sleep: deps.sleep,
      get: deps.launcher.get.bind(deps.launcher),
    });
  } finally {
    await deps.launcher.destroy(handle.id);
  }

  const summary = parseBenchmark(await deps.getArtifact(options.outputKey));
  log(`benchmark: ${summary.agents.length} agents over ${summary.games} games`);
  return summary;
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
  const modelPath = stringFlag("--model", "");
  if (modelPath === "") {
    console.error(
      "Usage: yarn dlx tsx scripts/remote/runRemoteBenchmark.ts --model <local.onnx> [--run-id ID] [--games N] [--seed-offset N] [--deck ID] [--stake ID] [--baseline REPO_PATH] [--no-shop] [--image IMG] [--out summary.json]",
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

  const modelKey = `benchmark/${runId}/candidate.onnx`;
  const outputKey = `benchmark/${runId}/summary.json`;

  await runPreflight(runId, {
    putMarker: (key, body) => putObject(s3Config, key, body),
    checkFly: () => launcher.assertReachable(),
    log: (message) => console.log(message),
  });

  console.log(`uploading candidate -> ${modelKey}`);
  await putObject(s3Config, modelKey, readFileSync(modelPath));

  const options: RemoteBenchmarkOptions = {
    runId,
    modelKey,
    outputKey,
    image: stringFlag("--image", requireEnv("DATASET_IMAGE")),
    guest: {
      cpus: intFlag("--cpus", 4),
      memoryMb: intFlag("--memory-mb", 2048),
      cpuKind: "shared",
    },
    benchmark: {
      games: intFlag("--games", 200),
      seedOffset: intFlag("--seed-offset", 5000),
      deck: stringFlag("--deck", DEFAULT_DECK),
      stake: stringFlag("--stake", DEFAULT_STAKE),
      shop: !process.argv.includes("--no-shop"),
      baseline: stringFlag("--baseline", ""),
    },
    workerEnv: {
      AWS_ENDPOINT_URL_S3: s3Config.endpoint,
      AWS_REGION: s3Config.region,
      BROWSLATRO_DATASET_BUCKET: s3Config.bucket,
      AWS_ACCESS_KEY_ID: s3Config.accessKeyId,
      AWS_SECRET_ACCESS_KEY: s3Config.secretAccessKey,
    },
  };

  const summary = await runRemoteBenchmark(options, {
    launcher,
    getArtifact: (key) => getObject(s3Config, key),
    sleep,
    log: (message) => console.log(message),
  });

  for (const agent of summary.agents) {
    console.log(
      `${agent.label}: winRate=${agent.winRate.toFixed(3)} avgBlinds=${agent.averageBlindsCleared.toFixed(2)} (${agent.wins}/${agent.games})`,
    );
  }

  const outPath = stringFlag("--out", "");
  if (outPath !== "") {
    writeFileSync(outPath, `${JSON.stringify(summary, null, 2)}\n`);
    console.log(`wrote ${outPath}`);
  }
}
