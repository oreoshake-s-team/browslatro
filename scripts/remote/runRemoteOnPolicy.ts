import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, join } from "node:path";
import { intFlag } from "../generateDataset";
import { FlyMachinesClient, type MachineGuest } from "./flyMachines";
import { FlyLogsClient } from "./flyLogs";
import { runPreflight } from "./preflight";
import { resolveRunId } from "./runId";
import { getObject, putObject, s3ConfigFromEnv } from "./s3";
import { runRemoteSelfPlay, resolveSelfPlayMemoryMb } from "./runRemoteSelfPlay";
import { runRemoteTraining, parseCpuKind } from "./runRemoteTraining";
import {
  runRemoteBenchmark,
  resolveBenchmarkMemoryMb,
  type AgentSummary,
  type BenchmarkSummary,
} from "./runRemoteBenchmark";

export interface OnPolicyKeys {
  readonly modelKey: string;
  readonly datasetKey: string;
  readonly summaryKey: string;
}

export function onPolicyKeys(runId: string, iteration: number): OnPolicyKeys {
  return {
    modelKey: `onpolicy/${runId}/iter-${iteration}.onnx`,
    datasetKey: `onpolicy/${runId}/sp-${iteration}.jsonl`,
    summaryKey: `onpolicy/${runId}/bench-${iteration}.json`,
  };
}

export function policyAgentSummary(summary: BenchmarkSummary): AgentSummary {
  const policyAgents = summary.agents.filter(
    (agent) => !agent.label.toLowerCase().includes("greedy"),
  );
  const chosen = policyAgents[policyAgents.length - 1];
  if (chosen === undefined) {
    throw new Error("benchmark summary has no policy agent to score the iteration by");
  }
  return chosen;
}

export interface OnPolicyIterationResult {
  readonly iteration: number;
  readonly records: number;
  readonly modelBytes: number;
  readonly winRate: number;
  readonly averageBlindsCleared: number;
}

export interface RemoteOnPolicyOptions {
  readonly runId: string;
  readonly iterations: number;
  readonly gamesPerIteration: number;
  readonly seedOffset: number;
  readonly initialModel: Buffer;
}

export interface RemoteOnPolicyDeps {
  readonly selfPlay: (
    iteration: number,
    shopModelKey: string,
    seedOffset: number,
  ) => Promise<{ dataset: Buffer; records: number }>;
  readonly train: (
    iteration: number,
    datasetKey: string,
    initKey: string,
    outputKey: string,
  ) => Promise<{ model: Buffer }>;
  readonly benchmark: (iteration: number, modelKey: string) => Promise<BenchmarkSummary>;
  readonly putObject: (key: string, body: Buffer) => Promise<void>;
  readonly saveModel: (iteration: number, model: Buffer) => void;
  readonly log?: (message: string) => void;
}

export async function runRemoteOnPolicy(
  options: RemoteOnPolicyOptions,
  deps: RemoteOnPolicyDeps,
): Promise<readonly OnPolicyIterationResult[]> {
  const log = deps.log ?? (() => {});
  let currentModelKey = onPolicyKeys(options.runId, 0).modelKey;
  log(`on-policy: uploading base policy -> ${currentModelKey}`);
  await deps.putObject(currentModelKey, options.initialModel);

  const results: OnPolicyIterationResult[] = [];
  for (let iteration = 1; iteration <= options.iterations; iteration += 1) {
    const keys = onPolicyKeys(options.runId, iteration);
    const seedOffset =
      options.seedOffset + (iteration - 1) * options.gamesPerIteration;

    log(`on-policy iter ${iteration}: sampling ${options.gamesPerIteration} games from ${currentModelKey}`);
    const { dataset, records } = await deps.selfPlay(iteration, currentModelKey, seedOffset);
    await deps.putObject(keys.datasetKey, dataset);

    log(`on-policy iter ${iteration}: training on ${records} decisions (init ${currentModelKey})`);
    const { model } = await deps.train(iteration, keys.datasetKey, currentModelKey, keys.modelKey);
    deps.saveModel(iteration, model);

    log(`on-policy iter ${iteration}: benchmarking ${keys.modelKey}`);
    const summary = await deps.benchmark(iteration, keys.modelKey);
    const agent = policyAgentSummary(summary);
    log(
      `on-policy iter ${iteration}: avgBlinds ${agent.averageBlindsCleared.toFixed(3)} win% ${(agent.winRate * 100).toFixed(1)}`,
    );

    results.push({
      iteration,
      records,
      modelBytes: model.length,
      winRate: agent.winRate,
      averageBlindsCleared: agent.averageBlindsCleared,
    });
    currentModelKey = keys.modelKey;
  }
  return results;
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
  const outDir = process.argv[2];
  const basePath = stringFlag("--base", "");
  if (outDir === undefined || outDir.startsWith("--") || basePath === "") {
    console.error(
      "Usage: yarn dlx tsx scripts/remote/runRemoteOnPolicy.ts <out-dir> --base <policy.onnx> [--run-id ID] [--iterations N] [--games N] [--machines N] [--seed-offset N] [--hand-model PATH] [--temperature T] [--hold-consumables] [--starts-file LOCAL.jsonl [--starts-fraction F]] [--epochs N] [--lr F] [--ppo-clip F] [--value-baseline] [--value-coef F] [--reward-to-go] [--gae LAMBDA] [--bench-games N] [--bench-seed N] [--selfplay-cpus N] [--selfplay-memory-mb N] [--bench-cpus N] [--train-cpus N] [--train-memory-mb N] [--cpu-kind shared|performance] [--no-tail]",
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

  const datasetImage = stringFlag("--image", requireEnv("DATASET_IMAGE"));
  const trainImage = stringFlag("--train-image", requireEnv("TRAIN_IMAGE"));
  const hold = process.argv.includes("--hold-consumables");
  const handModel = stringFlag("--hand-model", "public/models/advisor-policy-v9.onnx");
  const machines = intFlag("--machines", 8);
  const cpuKind = parseCpuKind(stringFlag("--cpu-kind", "shared"));
  const selfplayCpus = intFlag("--selfplay-cpus", 4);
  const selfplayMemoryMb = resolveSelfPlayMemoryMb(
    selfplayCpus,
    process.argv.includes("--selfplay-memory-mb")
      ? intFlag("--selfplay-memory-mb", 0)
      : undefined,
  );
  const benchCpus = intFlag("--bench-cpus", 4);
  const benchMemoryMb = resolveBenchmarkMemoryMb(benchCpus);
  const trainGuest: MachineGuest = {
    cpus: intFlag("--train-cpus", 4),
    memoryMb: intFlag("--train-memory-mb", 4096),
    cpuKind,
  };
  const workerEnv = {
    AWS_ENDPOINT_URL_S3: s3Config.endpoint,
    AWS_REGION: s3Config.region,
    BROWSLATRO_DATASET_BUCKET: s3Config.bucket,
    AWS_ACCESS_KEY_ID: s3Config.accessKeyId,
    AWS_SECRET_ACCESS_KEY: s3Config.secretAccessKey,
  };

  await runPreflight(runId, {
    putMarker: (key, body) => putObject(s3Config, key, body),
    checkFly: () => launcher.assertReachable(),
    log: (message) => console.log(message),
  });

  const startsFile = stringFlag("--starts-file", "");
  let startsKey: string | undefined;
  if (startsFile !== "") {
    startsKey = `onpolicy/${runId}/starts.jsonl`;
    console.log(`uploading deep-run starts -> ${startsKey}`);
    await putObject(s3Config, startsKey, readFileSync(startsFile));
  }
  const startsFraction = Number(stringFlag("--starts-fraction", "0.25"));

  mkdirSync(outDir, { recursive: true });

  const options: RemoteOnPolicyOptions = {
    runId,
    iterations: intFlag("--iterations", 8),
    gamesPerIteration: intFlag("--games", 3000),
    seedOffset: intFlag("--seed-offset", 0),
    initialModel: readFileSync(basePath),
  };

  const started = Date.now();
  const results = await runRemoteOnPolicy(options, {
    selfPlay: async (iteration, shopModelKey, seedOffset) => {
      const result = await runRemoteSelfPlay(
        {
          runId: `${runId}-i${iteration}`,
          totalGames: options.gamesPerIteration,
          machines,
          seedOffset,
          image: datasetImage,
          guest: { cpus: selfplayCpus, memoryMb: selfplayMemoryMb, cpuKind },
          selfPlay: {
            shopModel: "unused-downloaded-from-s3",
            shopModelKey,
            handModel,
            temperature: Number(stringFlag("--temperature", "1.0")),
            hold,
            parallelJobs: selfplayCpus,
            startsKey,
            startsFraction,
          },
          workerEnv,
        },
        {
          launcher,
          getShard: (key) => getObject(s3Config, key),
          sleep,
          log: (message) => console.log(message),
        },
      );
      return { dataset: result.dataset, records: result.records };
    },
    train: async (iteration, datasetKey, initKey, outputKey) => {
      const result = await runRemoteTraining(
        {
          runId: `${runId}-i${iteration}`,
          datasetKey,
          outputKey,
          image: trainImage,
          guest: trainGuest,
          train: {
            epochs: intFlag("--epochs", 20),
            shop: true,
            device: "cpu",
            human: false,
            humanWeight: 5,
            agreements: false,
            agreementsWeight: 1,
            correctionsWeight: 5,
            rl: {
              initKey,
              lr: Number(stringFlag("--lr", "1.3e-3")),
              ppoClip: Number(stringFlag("--ppo-clip", "0.3")),
              v2: hold,
              valueBaseline: process.argv.includes("--value-baseline"),
              valueCoef: Number(stringFlag("--value-coef", "0.5")),
              rewardToGo: process.argv.includes("--reward-to-go"),
              gae: process.argv.includes("--gae")
                ? Number(stringFlag("--gae", "0.9"))
                : undefined,
            },
          },
          workerEnv,
        },
        {
          launcher,
          getArtifact: (key) => getObject(s3Config, key),
          sleep,
          log: (message) => console.log(message),
          logs,
        },
      );
      return { model: result.model };
    },
    benchmark: (iteration, modelKey) =>
      runRemoteBenchmark(
        {
          runId: `${runId}-i${iteration}`,
          modelKey,
          outputKey: onPolicyKeys(runId, iteration).summaryKey,
          image: datasetImage,
          guest: { cpus: benchCpus, memoryMb: benchMemoryMb, cpuKind },
          benchmark: {
            games: intFlag("--bench-games", 500),
            seedOffset: intFlag("--bench-seed", 5000),
            deck: "red-deck",
            stake: "white",
            shop: true,
            shopCandidate: true,
            handModel,
            hold,
            parallelJobs: benchCpus,
          },
          workerEnv,
        },
        {
          launcher,
          getArtifact: (key) => getObject(s3Config, key),
          sleep,
          log: (message) => console.log(message),
        },
      ),
    putObject: (key, body) => putObject(s3Config, key, body),
    saveModel: (iteration, model) => {
      const path = join(outDir, `iter-${iteration}.onnx`);
      writeFileSync(path, model);
      console.log(`saved ${path}`);
    },
    log: (message) => console.log(message),
  });

  const summaryPath = join(outDir, "summary.json");
  writeFileSync(summaryPath, JSON.stringify({ runId, results }, null, 2));
  console.log(`\niter  avgBlinds  win%   records`);
  for (const row of results) {
    console.log(
      `${String(row.iteration).padStart(4)}  ${row.averageBlindsCleared.toFixed(3).padStart(9)}  ${(row.winRate * 100).toFixed(1).padStart(5)}  ${String(row.records).padStart(7)}`,
    );
  }
  console.log(`\ndone in ${((Date.now() - started) / 1000 / 60).toFixed(1)}m; summary -> ${summaryPath}`);
}
