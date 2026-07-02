// @vitest-environment node
import { describe, expect, test } from "vitest";
import {
  pipelineKeys,
  routePlayLog,
  runRemotePipeline,
  type PipelineRunners,
} from "./runRemotePipeline";
import type { BenchmarkSummary } from "./runRemoteBenchmark";

const SUMMARY: BenchmarkSummary = {
  games: 10,
  seedOffset: 5000,
  deck: "red-deck",
  stake: "white",
  agents: [{ label: "candidate", winRate: 0, averageBlindsCleared: 5.5, games: 10, wins: 0 }],
};

interface Recorder {
  readonly puts: { key: string; body: string }[];
  readonly trainArgs: { datasetKey: string; humanKey: string }[];
  readonly benchedKeys: string[];
}

function runners(rec: Recorder): PipelineRunners {
  return {
    regen: async () => ({ dataset: Buffer.from("DATASET"), records: 42 }),
    train: async (datasetKey, humanKey) => {
      rec.trainArgs.push({ datasetKey, humanKey });
      return { model: Buffer.from("MODEL") };
    },
    benchmark: async (modelKey) => {
      rec.benchedKeys.push(modelKey);
      return SUMMARY;
    },
    putObject: async (key, body) => {
      rec.puts.push({ key, body: body.toString() });
    },
    humanLog: () => Buffer.from("PLAYLOG"),
  };
}

function recorder(): Recorder {
  return { puts: [], trainArgs: [], benchedKeys: [] };
}

describe("pipelineKeys", () => {
  test("namespaces dataset, human, and candidate by run id", () => {
    expect(pipelineKeys("run1")).toEqual({
      datasetKey: "training/run1/dataset.jsonl",
      humanKey: "training/run1/human.jsonl",
      modelKey: "benchmark/run1/candidate.onnx",
    });
  });
});

describe("routePlayLog", () => {
  test("routes the play-log to agreements for shop training", () => {
    expect(routePlayLog(true, "training/run1/human.jsonl")).toEqual({
      agreementsKey: "training/run1/human.jsonl",
    });
  });

  test("routes the play-log to human imitation for hand training", () => {
    expect(routePlayLog(false, "training/run1/human.jsonl")).toEqual({
      humanKey: "training/run1/human.jsonl",
    });
  });
});

describe("runRemotePipeline", () => {
  test("uploads the regenerated dataset under the training dataset key", async () => {
    const rec = recorder();
    await runRemotePipeline("run1", runners(rec));
    expect(rec.puts).toContainEqual({ key: "training/run1/dataset.jsonl", body: "DATASET" });
  });

  test("uploads the play-log under the training human key", async () => {
    const rec = recorder();
    await runRemotePipeline("run1", runners(rec));
    expect(rec.puts).toContainEqual({ key: "training/run1/human.jsonl", body: "PLAYLOG" });
  });

  test("trains against the dataset and human keys it uploaded", async () => {
    const rec = recorder();
    await runRemotePipeline("run1", runners(rec));
    expect(rec.trainArgs).toEqual([
      { datasetKey: "training/run1/dataset.jsonl", humanKey: "training/run1/human.jsonl" },
    ]);
  });

  test("uploads the trained model under the benchmark candidate key", async () => {
    const rec = recorder();
    await runRemotePipeline("run1", runners(rec));
    expect(rec.puts).toContainEqual({ key: "benchmark/run1/candidate.onnx", body: "MODEL" });
  });

  test("benchmarks the uploaded candidate", async () => {
    const rec = recorder();
    await runRemotePipeline("run1", runners(rec));
    expect(rec.benchedKeys).toEqual(["benchmark/run1/candidate.onnx"]);
  });

  test("returns the benchmark summary and record count", async () => {
    const result = await runRemotePipeline("run1", runners(recorder()));
    expect([result.summary.agents[0].averageBlindsCleared, result.records]).toEqual([5.5, 42]);
  });
});
