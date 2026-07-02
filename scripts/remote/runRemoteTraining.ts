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
import { runPreflight } from "./preflight";
import { resolveRunId } from "./runId";
import { getObject, putObject, s3ConfigFromEnv } from "./s3";

export interface TrainArgs {
  readonly epochs: number;
  readonly shop: boolean;
  readonly device: string;
  readonly human: boolean;
  readonly humanWeight: number;
  readonly humanKey?: string;
  readonly agreements: boolean;
  readonly agreementsWeight: number;
  readonly agreementsKey?: string;
  readonly correctionsWeight: number;
  readonly correctionsKey?: string;
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
  const env: Record<string, string> = {
    DATASET_KEY: datasetKey,
    OUTPUT_KEY: outputKey,
    EPOCHS: String(train.epochs),
    DEVICE: train.device,
    SHOP: train.shop ? "1" : "0",
    HUMAN: train.human ? "1" : "0",
    HUMAN_WEIGHT: String(train.humanWeight),
    AGREEMENTS: train.agreements ? "1" : "0",
    AGREEMENTS_WEIGHT: String(train.agreementsWeight),
    CORRECTIONS_WEIGHT: String(train.correctionsWeight),
  };
  if (train.humanKey !== undefined && train.humanKey !== "") {
    env.HUMAN_KEY = train.humanKey;
  }
  if (train.agreementsKey !== undefined && train.agreementsKey !== "") {
    env.AGREEMENTS_KEY = train.agreementsKey;
  }
  if (train.correctionsKey !== undefined && train.correctionsKey !== "") {
    env.CORRECTIONS_KEY = train.correctionsKey;
  }
  return env;
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

export function parseCpuKind(raw: string): "shared" | "performance" {
  if (raw === "shared" || raw === "performance") return raw;
  throw new Error(`--cpu-kind must be "shared" or "performance", got "${raw}"`);
}

const sleep = (ms: number): Promise<void> => new Promise((res) => setTimeout(res, ms));

if (isMain) {
  const outPath = process.argv[2];
  const datasetPath = stringFlag("--dataset", "");
  if (outPath === undefined || outPath.startsWith("--") || datasetPath === "") {
    console.error(
      "Usage: yarn dlx tsx scripts/remote/runRemoteTraining.ts <out.onnx> --dataset <local.jsonl> [--run-id ID] [--epochs N] [--shop] [--human] [--human-file PATH] [--human-weight N] [--corrections-file PATH] [--corrections-weight N] [--agreements] [--agreements-file PATH] [--agreements-weight N] [--image IMG] [--cpus N] [--memory-mb N] [--cpu-kind shared|performance]",
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

  const datasetKey = `training/${runId}/dataset.jsonl`;
  const outputKey = `training/${runId}/model.onnx`;

  await runPreflight(runId, {
    putMarker: (key, body) => putObject(s3Config, key, body),
    checkFly: () => launcher.assertReachable(),
    log: (message) => console.log(message),
  });

  console.log(`uploading dataset -> ${datasetKey}`);
  await putObject(s3Config, datasetKey, readFileSync(datasetPath));

  const humanFilePath = stringFlag("--human-file", "");
  let humanKey: string | undefined;
  if (humanFilePath !== "") {
    humanKey = `training/${runId}/human.jsonl`;
    console.log(`uploading human-play log -> ${humanKey}`);
    await putObject(s3Config, humanKey, readFileSync(humanFilePath));
  }

  const correctionsFilePath = stringFlag("--corrections-file", "");
  let correctionsKey: string | undefined;
  if (correctionsFilePath !== "") {
    correctionsKey = `training/${runId}/corrections.jsonl`;
    console.log(`uploading gated corrections -> ${correctionsKey}`);
    await putObject(s3Config, correctionsKey, readFileSync(correctionsFilePath));
  }

  const agreementsFilePath = stringFlag("--agreements-file", "");
  let agreementsKey: string | undefined;
  if (agreementsFilePath !== "") {
    agreementsKey = `training/${runId}/agreements.jsonl`;
    console.log(`uploading agreements log -> ${agreementsKey}`);
    await putObject(s3Config, agreementsKey, readFileSync(agreementsFilePath));
  }

  const options: RemoteTrainingOptions = {
    runId,
    datasetKey,
    outputKey,
    image: stringFlag("--image", requireEnv("TRAIN_IMAGE")),
    guest: {
      cpus: intFlag("--cpus", 4),
      memoryMb: intFlag("--memory-mb", 4096),
      cpuKind: parseCpuKind(stringFlag("--cpu-kind", "shared")),
    },
    train: {
      epochs: intFlag("--epochs", 30),
      shop: hasFlag("--shop"),
      device: "cpu",
      human: hasFlag("--human"),
      humanWeight: intFlag("--human-weight", 5),
      humanKey,
      agreements: hasFlag("--agreements"),
      agreementsWeight: intFlag("--agreements-weight", 1),
      agreementsKey,
      correctionsWeight: intFlag("--corrections-weight", 5),
      correctionsKey,
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
