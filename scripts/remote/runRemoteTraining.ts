import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { intFlag } from "../generateDataset";
import {
  FlyMachinesClient,
  type MachineGuest,
  type MachineLauncher,
} from "./flyMachines";
import { waitForMachineTerminal } from "./machineWait";
import { getObject, putObject, s3ConfigFromEnv } from "./s3";

export interface TrainArgs {
  readonly epochs: number;
  readonly shop: boolean;
  readonly device: string;
}

export interface RemoteTrainingOptions {
  readonly runId: string;
  readonly datasetKey: string;
  readonly outputKey: string;
  readonly image: string;
  readonly guest: MachineGuest;
  readonly train: TrainArgs;
  readonly workerEnv: Record<string, string>;
  readonly pollIntervalMs?: number;
  readonly maxWaitMs?: number;
}

export interface RemoteTrainingDeps {
  readonly launcher: MachineLauncher;
  readonly getArtifact: (key: string) => Promise<Buffer>;
  readonly sleep: (ms: number) => Promise<void>;
  readonly log?: (message: string) => void;
}

export interface RemoteTrainingResult {
  readonly model: Buffer;
  readonly bytes: number;
}

export function trainingEnv(
  datasetKey: string,
  outputKey: string,
  train: TrainArgs,
): Record<string, string> {
  return {
    DATASET_KEY: datasetKey,
    OUTPUT_KEY: outputKey,
    EPOCHS: String(train.epochs),
    DEVICE: train.device,
    SHOP: train.shop ? "1" : "0",
  };
}

export async function runRemoteTraining(
  options: RemoteTrainingOptions,
  deps: RemoteTrainingDeps,
): Promise<RemoteTrainingResult> {
  const log = deps.log ?? (() => {});
  const handle = await deps.launcher.run({
    name: `${options.runId}-train`,
    image: options.image,
    env: { ...options.workerEnv, ...trainingEnv(options.datasetKey, options.outputKey, options.train) },
    guest: options.guest,
  });
  log(`training: launched machine ${handle.id} on ${options.datasetKey}`);

  try {
    await waitForMachineTerminal(handle.id, handle.state, "training", {
      pollIntervalMs: options.pollIntervalMs ?? 10_000,
      maxWaitMs: options.maxWaitMs ?? 60 * 60_000,
      sleep: deps.sleep,
      get: deps.launcher.get.bind(deps.launcher),
    });
  } finally {
    await deps.launcher.destroy(handle.id);
  }

  const model = await deps.getArtifact(options.outputKey);
  if (model.length === 0) {
    throw new Error(
      `training produced an empty object at ${options.outputKey}; the run did not export a model`,
    );
  }
  log(`training: collected model (${model.length} bytes)`);
  return { model, bytes: model.length };
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
  const datasetPath = stringFlag("--dataset", "");
  if (outPath === undefined || outPath.startsWith("--") || datasetPath === "") {
    console.error(
      "Usage: yarn dlx tsx scripts/remote/runRemoteTraining.ts <out.onnx> --dataset <local.jsonl> --run-id ID [--epochs N] [--shop] [--image IMG] [--cpus N] [--memory-mb N]",
    );
    process.exit(1);
  }

  const runId = stringFlag("--run-id", "");
  const s3Config = s3ConfigFromEnv();
  const launcher = new FlyMachinesClient({
    app: requireEnv("FLY_APP"),
    token: requireEnv("FLY_API_TOKEN"),
  });

  const datasetKey = `training/${runId}/dataset.jsonl`;
  const outputKey = `training/${runId}/model.onnx`;

  console.log(`uploading dataset -> ${datasetKey}`);
  await putObject(s3Config, datasetKey, readFileSync(datasetPath));

  const options: RemoteTrainingOptions = {
    runId,
    datasetKey,
    outputKey,
    image: stringFlag("--image", requireEnv("TRAIN_IMAGE")),
    guest: {
      cpus: intFlag("--cpus", 4),
      memoryMb: intFlag("--memory-mb", 4096),
      cpuKind: "shared",
    },
    train: {
      epochs: intFlag("--epochs", 30),
      shop: hasFlag("--shop"),
      device: "cpu",
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
  const result = await runRemoteTraining(options, {
    launcher,
    getArtifact: (key) => getObject(s3Config, key),
    sleep,
    log: (message) => console.log(message),
  });
  writeFileSync(outPath, result.model);
  console.log(`trained model (${result.bytes} bytes) in ${((Date.now() - started) / 1000).toFixed(1)}s`);
  console.log(`wrote ${outPath}`);
}
