import { readFileSync, writeFileSync } from "node:fs";
import { HAND_MODEL_REPO_PATH, SHOP_MODEL_REPO_PATH } from "../../src/ai/advisor/productionModels";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { intFlag } from "../generateDataset";
import { DEFAULT_DECK } from "../../src/items/decks";
import { DEFAULT_STAKE } from "../../src/items/stakes";
import { FlyMachinesClient, type MachineGuest } from "./flyMachines";
import { FlyLogsClient } from "./flyLogs";
import { runPreflight } from "./preflight";
import { getObject, putObject, s3ConfigFromEnv } from "./s3";
import { resolveRunId } from "./runId";
import { runRemoteDataset, type RemoteDatasetOptions } from "./runRemoteDataset";
import { parseCpuKind, runRemoteTraining, type RemoteTrainingOptions } from "./runRemoteTraining";
import {
  runRemoteBenchmark,
  type BenchmarkSummary,
  type RemoteBenchmarkOptions,
} from "./runRemoteBenchmark";

export interface PipelineKeys {
  readonly datasetKey: string;
  readonly humanKey: string;
  readonly modelKey: string;
}

export function pipelineKeys(runId: string): PipelineKeys {
  return {
    datasetKey: `training/${runId}/dataset.jsonl`,
    humanKey: `training/${runId}/human.jsonl`,
    modelKey: `benchmark/${runId}/candidate.onnx`,
  };
}

export interface PipelineRunners {
  readonly regen: () => Promise<{ dataset: Buffer; records: number }>;
  readonly train: (datasetKey: string, humanKey: string) => Promise<{ model: Buffer }>;
  readonly benchmark: (modelKey: string) => Promise<BenchmarkSummary>;
  readonly putObject: (key: string, body: Buffer) => Promise<void>;
  readonly humanLog: () => Buffer;
  readonly log?: (message: string) => void;
}

export interface PipelineResult {
  readonly summary: BenchmarkSummary;
  readonly model: Buffer;
  readonly records: number;
}

export function routePlayLog(
  shop: boolean,
  humanKey: string,
): { readonly humanKey?: string; readonly agreementsKey?: string } {
  return shop ? { agreementsKey: humanKey } : { humanKey };
}

export async function runRemotePipeline(
  runId: string,
  runners: PipelineRunners,
): Promise<PipelineResult> {
  const log = runners.log ?? (() => {});
  const keys = pipelineKeys(runId);

  log("pipeline: regenerating dataset");
  const { dataset, records } = await runners.regen();
  await runners.putObject(keys.datasetKey, dataset);
  await runners.putObject(keys.humanKey, runners.humanLog());

  log(`pipeline: training on ${records} records + uploaded play-log`);
  const { model } = await runners.train(keys.datasetKey, keys.humanKey);
  await runners.putObject(keys.modelKey, model);

  log("pipeline: benchmarking candidate");
  const summary = await runners.benchmark(keys.modelKey);

  return { summary, model, records };
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
  const playLog = process.argv[2];
  if (playLog === undefined || playLog.startsWith("--")) {
    console.error(
      "Usage: yarn dlx tsx scripts/remote/runRemotePipeline.ts <play-log.jsonl> [--run-id ID] [--games N] [--machines N] [--epochs N] [--shop] [--human-weight N] [--corrections-file PATH] [--corrections-weight N] [--agreements-weight N] [--shop-policy PATH] [--baseline PATH] [--bench-games N] [--bench-seed N] [--cpu-kind shared|performance] [--out-model PATH] [--out-summary PATH] [--no-tail]",
    );
    process.exit(1);
  }
  const runId = resolveRunId(stringFlag("--run-id", ""));
  console.log(`run id: ${runId}`);

  const s3Config = s3ConfigFromEnv();
  const flyApp = requireEnv("FLY_APP");
  const flyToken = requireEnv("FLY_API_TOKEN");
  const launcher = new FlyMachinesClient({ app: flyApp, token: flyToken });
  const logs = process.argv.includes("--no-tail")
    ? undefined
    : new FlyLogsClient({ app: flyApp, token: flyToken });
  const workerEnv: Record<string, string> = {
    AWS_ENDPOINT_URL_S3: s3Config.endpoint,
    AWS_REGION: s3Config.region,
    BROWSLATRO_DATASET_BUCKET: s3Config.bucket,
    AWS_ACCESS_KEY_ID: s3Config.accessKeyId,
    AWS_SECRET_ACCESS_KEY: s3Config.secretAccessKey,
  };
  const datasetImage = stringFlag("--dataset-image", requireEnv("DATASET_IMAGE"));
  const trainImage = stringFlag("--train-image", requireEnv("TRAIN_IMAGE"));
  const sharedGuest: MachineGuest = { cpus: intFlag("--cpus", 4), memoryMb: 2048, cpuKind: "shared" };
  const deck = stringFlag("--deck", DEFAULT_DECK);
  const stake = stringFlag("--stake", DEFAULT_STAKE);
  const shop = !process.argv.includes("--no-shop");
  const deps = { launcher, getArtifact: (k: string) => getObject(s3Config, k), sleep, log: console.log };

  await runPreflight(runId, {
    putMarker: (key, body) => putObject(s3Config, key, body),
    checkFly: () => launcher.assertReachable(),
    log: (message) => console.log(message),
  });

  const datasetOptions: RemoteDatasetOptions = {
    runId,
    totalGames: intFlag("--games", 2000),
    machines: intFlag("--machines", 8),
    image: datasetImage,
    guest: sharedGuest,
    generate: {
      rollouts: intFlag("--rollouts", 4),
      topN: intFlag("--top-n", 3),
      maxAnte: intFlag("--max-ante", 8),
      deck,
      stake,
      jokerLoadoutFraction: 0,
      shopPolicy: stringFlag("--shop-policy", SHOP_MODEL_REPO_PATH),
    },
    workerEnv,
  };
  const trainGuest: MachineGuest = {
    cpus: intFlag("--cpus", 4),
    memoryMb: 4096,
    cpuKind: parseCpuKind(stringFlag("--cpu-kind", "shared")),
  };

  const correctionsFilePath = stringFlag("--corrections-file", "");
  let correctionsKey: string | undefined;
  if (correctionsFilePath !== "") {
    correctionsKey = `training/${runId}/corrections.jsonl`;
    console.log(`uploading gated corrections -> ${correctionsKey}`);
    await putObject(s3Config, correctionsKey, readFileSync(correctionsFilePath));
  }

  const result = await runRemotePipeline(runId, {
    regen: () => runRemoteDataset(datasetOptions, { ...deps, getShard: deps.getArtifact }),
    train: (datasetKey, humanKey) => {
      const options: RemoteTrainingOptions = {
        runId,
        datasetKey,
        outputKey: `training/${runId}/model.onnx`,
        image: trainImage,
        guest: trainGuest,
        train: {
          epochs: intFlag("--epochs", 30),
          shop,
          device: "cpu",
          human: false,
          humanWeight: intFlag("--human-weight", 5),
          agreements: false,
          agreementsWeight: intFlag("--agreements-weight", 1),
          correctionsWeight: intFlag("--corrections-weight", 5),
          correctionsKey,
          ...routePlayLog(shop, humanKey),
        },
        workerEnv,
      };
      return runRemoteTraining(options, { ...deps, logs });
    },
    benchmark: (modelKey) => {
      const options: RemoteBenchmarkOptions = {
        runId,
        modelKey,
        outputKey: `benchmark/${runId}/summary.json`,
        image: datasetImage,
        guest: sharedGuest,
        benchmark: {
          games: intFlag("--bench-games", 500),
          seedOffset: intFlag("--bench-seed", 5000),
          deck,
          stake,
          shop,
          baseline: stringFlag("--baseline", HAND_MODEL_REPO_PATH),
        },
        workerEnv,
      };
      return runRemoteBenchmark(options, deps);
    },
    putObject: (key, body) => putObject(s3Config, key, body),
    humanLog: () => readFileSync(playLog),
    log: (message) => console.log(message),
  });

  writeFileSync(stringFlag("--out-model", "candidate.onnx"), result.model);
  writeFileSync(stringFlag("--out-summary", "summary.json"), JSON.stringify(result.summary, null, 2));
  console.log(`\npipeline complete (${result.records} dataset records):`);
  for (const agent of result.summary.agents) {
    console.log(
      `  ${agent.label}: winRate=${agent.winRate.toFixed(3)} avgBlinds=${agent.averageBlindsCleared.toFixed(2)} (${agent.wins}/${agent.games})`,
    );
  }
}
