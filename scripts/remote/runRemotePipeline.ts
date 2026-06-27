import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { intFlag } from "../generateDataset";
import { DEFAULT_DECK } from "../../src/items/decks";
import { DEFAULT_STAKE } from "../../src/items/stakes";
import { FlyMachinesClient } from "./flyMachines";
import { runPreflight } from "./preflight";
import { getObject, putObject, s3ConfigFromEnv } from "./s3";
import { runRemoteDataset, type RemoteDatasetOptions, type RemoteDatasetResult } from "./runRemoteDataset";
import { runRemoteTraining, type RemoteTrainingOptions, type RemoteTrainingResult } from "./runRemoteTraining";
import { runRemoteBenchmark, type BenchmarkSummary, type RemoteBenchmarkOptions } from "./runRemoteBenchmark";

export interface RemotePipelineOptions {
  readonly dataset: RemoteDatasetOptions;
  readonly training: RemoteTrainingOptions;
  readonly benchmark: RemoteBenchmarkOptions;
}

export interface RemotePipelineDeps {
  readonly generate: (options: RemoteDatasetOptions) => Promise<RemoteDatasetResult>;
  readonly putArtifact: (key: string, body: Buffer) => Promise<void>;
  readonly train: (options: RemoteTrainingOptions) => Promise<RemoteTrainingResult>;
  readonly benchmark: (options: RemoteBenchmarkOptions) => Promise<BenchmarkSummary>;
  readonly log?: (message: string) => void;
}

export interface RemotePipelineResult {
  readonly records: number;
  readonly modelBytes: number;
  readonly summary: BenchmarkSummary;
}

export async function runRemotePipeline(
  options: RemotePipelineOptions,
  deps: RemotePipelineDeps,
): Promise<RemotePipelineResult> {
  const log = deps.log ?? (() => {});

  log("pipeline: generating dataset");
  const generated = await deps.generate(options.dataset);

  log(`pipeline: uploading dataset (${generated.records} records) -> ${options.training.datasetKey}`);
  await deps.putArtifact(options.training.datasetKey, generated.dataset);

  log("pipeline: training");
  const trained = await deps.train(options.training);

  log("pipeline: benchmarking trained model");
  const summary = await deps.benchmark(options.benchmark);

  return { records: generated.records, modelBytes: trained.bytes, summary };
}

const __filename = fileURLToPath(import.meta.url);
const isMain = !!process.argv[1] && resolve(process.argv[1]) === __filename;

function stringFlag(name: string, fallback: string): string {
  const index = process.argv.indexOf(name);
  if (index === -1 || index + 1 >= process.argv.length) return fallback;
  return process.argv[index + 1];
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === "") throw new Error(`missing required env ${name}`);
  return value;
}

const sleep = (ms: number): Promise<void> => new Promise((res) => setTimeout(res, ms));

if (isMain) {
  const outPath = process.argv[2];
  if (outPath === undefined || outPath.startsWith("--") || stringFlag("--run-id", "") === "") {
    console.error(
      "Usage: yarn dlx tsx scripts/remote/runRemotePipeline.ts <out.onnx> --run-id ID [--games N] [--machines N] [--epochs N] [--shop] [--human] [--benchmark-games N] [--baseline REPO_PATH] [--shop-policy PATH] [--summary-out FILE]",
    );
    process.exit(1);
  }

  const runId = stringFlag("--run-id", "");
  const deck = stringFlag("--deck", DEFAULT_DECK);
  const stake = stringFlag("--stake", DEFAULT_STAKE);
  const shop = hasFlag("--shop");
  const shopPolicy = stringFlag("--shop-policy", "");

  const s3Config = s3ConfigFromEnv();
  const launcher = new FlyMachinesClient({
    app: requireEnv("FLY_APP"),
    token: requireEnv("FLY_API_TOKEN"),
  });
  const workerEnv = {
    AWS_ENDPOINT_URL_S3: s3Config.endpoint,
    AWS_REGION: s3Config.region,
    BROWSLATRO_DATASET_BUCKET: s3Config.bucket,
    AWS_ACCESS_KEY_ID: s3Config.accessKeyId,
    AWS_SECRET_ACCESS_KEY: s3Config.secretAccessKey,
  };

  const workerImage = stringFlag("--image", requireEnv("DATASET_IMAGE"));
  const trainImage = stringFlag("--train-image", requireEnv("TRAIN_IMAGE"));
  const modelKey = `training/${runId}/model.onnx`;

  await runPreflight(runId, {
    putMarker: (key, body) => putObject(s3Config, key, body),
    checkFly: () => launcher.assertReachable(),
    log: (message) => console.log(message),
  });

  const options: RemotePipelineOptions = {
    dataset: {
      runId,
      totalGames: intFlag("--games", 1000),
      machines: intFlag("--machines", 4),
      image: workerImage,
      guest: { cpus: intFlag("--cpus", 4), memoryMb: intFlag("--memory-mb", 2048), cpuKind: "shared" },
      generate: {
        rollouts: intFlag("--rollouts", 4),
        topN: intFlag("--top-n", 3),
        maxAnte: intFlag("--max-ante", 8),
        deck,
        stake,
        jokerLoadoutFraction: 0,
        shopPolicy,
      },
      workerEnv,
    },
    training: {
      runId,
      datasetKey: `training/${runId}/dataset.jsonl`,
      outputKey: modelKey,
      image: trainImage,
      guest: { cpus: intFlag("--train-cpus", 4), memoryMb: intFlag("--train-memory-mb", 4096), cpuKind: "shared" },
      train: {
        epochs: intFlag("--epochs", 30),
        shop,
        device: "cpu",
        human: hasFlag("--human"),
        humanWeight: intFlag("--human-weight", 5),
      },
      workerEnv,
    },
    benchmark: {
      runId,
      modelKey,
      outputKey: `benchmark/${runId}/summary.json`,
      image: workerImage,
      guest: { cpus: intFlag("--cpus", 4), memoryMb: intFlag("--memory-mb", 2048), cpuKind: "shared" },
      benchmark: {
        games: intFlag("--benchmark-games", 200),
        seedOffset: intFlag("--seed-offset", 5000),
        deck,
        stake,
        shop: !hasFlag("--no-shop"),
        baseline: stringFlag("--baseline", ""),
      },
      workerEnv,
    },
  };

  const started = Date.now();
  const result = await runRemotePipeline(options, {
    generate: (o) => runRemoteDataset(o, { launcher, getShard: (k) => getObject(s3Config, k), sleep, log: (m) => console.log(m) }),
    putArtifact: (key, body) => putObject(s3Config, key, body),
    train: (o) => runRemoteTraining(o, { launcher, getArtifact: (k) => getObject(s3Config, k), sleep, log: (m) => console.log(m) }),
    benchmark: (o) => runRemoteBenchmark(o, { launcher, getArtifact: (k) => getObject(s3Config, k), sleep, log: (m) => console.log(m) }),
    log: (m) => console.log(m),
  });

  const model = await getObject(s3Config, modelKey);
  writeFileSync(outPath, model);

  for (const agent of result.summary.agents) {
    console.log(
      `${agent.label}: winRate=${agent.winRate.toFixed(3)} avgBlinds=${agent.averageBlindsCleared.toFixed(2)} (${agent.wins}/${agent.games})`,
    );
  }

  const summaryOut = stringFlag("--summary-out", "");
  if (summaryOut !== "") {
    writeFileSync(summaryOut, `${JSON.stringify(result.summary, null, 2)}\n`);
    console.log(`wrote ${summaryOut}`);
  }

  console.log(
    `pipeline done in ${((Date.now() - started) / 1000).toFixed(1)}s: ${result.records} records, model ${result.modelBytes} bytes`,
  );
  console.log(`wrote ${outPath}`);
}
