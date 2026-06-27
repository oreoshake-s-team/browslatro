// @vitest-environment node
import { describe, expect, test, vi } from "vitest";
import { runRemotePipeline, type RemotePipelineOptions } from "./runRemotePipeline";
import type { RemoteDatasetResult } from "./runRemoteDataset";
import type { RemoteTrainingResult } from "./runRemoteTraining";
import type { BenchmarkSummary } from "./runRemoteBenchmark";

const SUMMARY: BenchmarkSummary = {
  games: 200,
  seedOffset: 5000,
  deck: "red-deck",
  stake: "white",
  agents: [{ label: "candidate", winRate: 0.2, averageBlindsCleared: 15, games: 200, wins: 40 }],
};

const GENERATED: RemoteDatasetResult = {
  shards: [],
  dataset: Buffer.from("a\nb\n"),
  records: 2,
};

const TRAINED: RemoteTrainingResult = { model: Buffer.from("onnx"), bytes: 4 };

function options(): RemotePipelineOptions {
  const workerEnv = { AWS_ACCESS_KEY_ID: "AKID" };
  const guest = { cpus: 2, memoryMb: 1024 };
  return {
    dataset: {
      runId: "run1",
      totalGames: 4,
      machines: 2,
      image: "worker",
      guest,
      generate: { rollouts: 4, topN: 3, maxAnte: 8, deck: "red-deck", stake: "white", jokerLoadoutFraction: 0 },
      workerEnv,
    },
    training: {
      runId: "run1",
      datasetKey: "training/run1/dataset.jsonl",
      outputKey: "training/run1/model.onnx",
      image: "train",
      guest,
      train: { epochs: 30, shop: false, device: "cpu", human: false, humanWeight: 5 },
      workerEnv,
    },
    benchmark: {
      runId: "run1",
      modelKey: "training/run1/model.onnx",
      outputKey: "benchmark/run1/summary.json",
      image: "worker",
      guest,
      benchmark: { games: 200, seedOffset: 5000, deck: "red-deck", stake: "white", shop: true },
      workerEnv,
    },
  };
}

function deps(overrides: Partial<Parameters<typeof runRemotePipeline>[1]> = {}) {
  const calls: string[] = [];
  return {
    calls,
    deps: {
      generate: vi.fn(async () => {
        calls.push("generate");
        return GENERATED;
      }),
      putArtifact: vi.fn(async () => {
        calls.push("putArtifact");
      }),
      train: vi.fn(async () => {
        calls.push("train");
        return TRAINED;
      }),
      benchmark: vi.fn(async () => {
        calls.push("benchmark");
        return SUMMARY;
      }),
      ...overrides,
    },
  };
}

describe("runRemotePipeline", () => {
  test("runs the stages in order", async () => {
    const { calls, deps: d } = deps();
    await runRemotePipeline(options(), d);
    expect(calls).toEqual(["generate", "putArtifact", "train", "benchmark"]);
  });

  test("uploads the generated dataset under the training dataset key", async () => {
    const { deps: d } = deps();
    await runRemotePipeline(options(), d);
    expect(d.putArtifact).toHaveBeenCalledWith("training/run1/dataset.jsonl", GENERATED.dataset);
  });

  test("returns the records, model size, and benchmark summary", async () => {
    const { deps: d } = deps();
    const result = await runRemotePipeline(options(), d);
    expect(result).toEqual({ records: 2, modelBytes: 4, summary: SUMMARY });
  });

  test("aborts before benchmarking when training fails", async () => {
    const benchmark = vi.fn(async () => SUMMARY);
    const { deps: d } = deps({
      train: vi.fn(async () => {
        throw new Error("training crashed");
      }),
      benchmark,
    });
    await expect(runRemotePipeline(options(), d)).rejects.toThrow(/training crashed/);
    expect(benchmark).not.toHaveBeenCalled();
  });
});
