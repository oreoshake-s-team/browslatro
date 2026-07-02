// @vitest-environment node
import { describe, expect, test } from "vitest";
import {
  onPolicyKeys,
  policyAgentSummary,
  runRemoteOnPolicy,
  type RemoteOnPolicyDeps,
  type RemoteOnPolicyOptions,
} from "./runRemoteOnPolicy";
import type { BenchmarkSummary } from "./runRemoteBenchmark";

function summary(avgBlinds: number): BenchmarkSummary {
  return {
    games: 500,
    seedOffset: 5000,
    deck: "red-deck",
    stake: "white",
    agents: [
      { label: "greedy (baseline)", winRate: 0, averageBlindsCleared: 1.4, games: 500, wins: 0 },
      { label: "advisor-policy-v9.onnx", winRate: 0, averageBlindsCleared: avgBlinds, games: 500, wins: 0 },
    ],
  };
}

interface Calls {
  readonly selfPlay: Array<{ iteration: number; shopModelKey: string; seedOffset: number }>;
  readonly train: Array<{ iteration: number; datasetKey: string; initKey: string; outputKey: string }>;
  readonly benchmark: Array<{ iteration: number; modelKey: string }>;
  readonly put: Array<{ key: string; bytes: number }>;
  readonly saved: number[];
}

function fakeDeps(): { deps: RemoteOnPolicyDeps; calls: Calls } {
  const calls: Calls = { selfPlay: [], train: [], benchmark: [], put: [], saved: [] };
  const deps: RemoteOnPolicyDeps = {
    selfPlay: async (iteration, shopModelKey, seedOffset) => {
      calls.selfPlay.push({ iteration, shopModelKey, seedOffset });
      return { dataset: Buffer.from(`sp-${iteration}`), records: 10 * iteration };
    },
    train: async (iteration, datasetKey, initKey, outputKey) => {
      calls.train.push({ iteration, datasetKey, initKey, outputKey });
      return { model: Buffer.from(`model-${iteration}`) };
    },
    benchmark: async (iteration, modelKey) => {
      calls.benchmark.push({ iteration, modelKey });
      return summary(4 + iteration / 10);
    },
    putObject: async (key, body) => {
      calls.put.push({ key, bytes: body.length });
    },
    saveModel: (iteration) => {
      calls.saved.push(iteration);
    },
  };
  return { deps, calls };
}

function options(overrides: Partial<RemoteOnPolicyOptions> = {}): RemoteOnPolicyOptions {
  return {
    runId: "run1",
    iterations: 2,
    gamesPerIteration: 100,
    seedOffset: 7,
    initialModel: Buffer.from("base"),
    ...overrides,
  };
}

describe("onPolicyKeys", () => {
  test("namespaces model, dataset, and summary keys by run and iteration", () => {
    expect(onPolicyKeys("run1", 3)).toEqual({
      modelKey: "onpolicy/run1/iter-3.onnx",
      datasetKey: "onpolicy/run1/sp-3.jsonl",
      summaryKey: "onpolicy/run1/bench-3.json",
    });
  });
});

describe("policyAgentSummary", () => {
  test("picks the policy agent over the greedy baseline", () => {
    expect(policyAgentSummary(summary(4.5)).averageBlindsCleared).toBe(4.5);
  });

  test("throws when only greedy agents are present", () => {
    const onlyGreedy: BenchmarkSummary = {
      games: 1,
      seedOffset: 0,
      deck: "red-deck",
      stake: "white",
      agents: [{ label: "greedy (baseline)", winRate: 0, averageBlindsCleared: 1, games: 1, wins: 0 }],
    };
    expect(() => policyAgentSummary(onlyGreedy)).toThrow(/no policy agent/);
  });
});

describe("runRemoteOnPolicy", () => {
  test("uploads the base policy as iteration zero before sampling", async () => {
    const { deps, calls } = fakeDeps();
    await runRemoteOnPolicy(options(), deps);
    expect(calls.put[0]).toEqual({ key: "onpolicy/run1/iter-0.onnx", bytes: 4 });
  });

  test("samples each iteration from the previous iteration's model", async () => {
    const { deps, calls } = fakeDeps();
    await runRemoteOnPolicy(options(), deps);
    expect(calls.selfPlay.map((c) => c.shopModelKey)).toEqual([
      "onpolicy/run1/iter-0.onnx",
      "onpolicy/run1/iter-1.onnx",
    ]);
  });

  test("advances the seed offset by games-per-iteration each round", async () => {
    const { deps, calls } = fakeDeps();
    await runRemoteOnPolicy(options(), deps);
    expect(calls.selfPlay.map((c) => c.seedOffset)).toEqual([7, 107]);
  });

  test("warm-starts each training round from the sampling policy", async () => {
    const { deps, calls } = fakeDeps();
    await runRemoteOnPolicy(options(), deps);
    expect(calls.train.map((c) => c.initKey)).toEqual([
      "onpolicy/run1/iter-0.onnx",
      "onpolicy/run1/iter-1.onnx",
    ]);
  });

  test("uploads each iteration's dataset under its own key", async () => {
    const { deps, calls } = fakeDeps();
    await runRemoteOnPolicy(options(), deps);
    expect(calls.put.map((c) => c.key)).toContain("onpolicy/run1/sp-2.jsonl");
  });

  test("benchmarks the freshly trained model each iteration", async () => {
    const { deps, calls } = fakeDeps();
    await runRemoteOnPolicy(options(), deps);
    expect(calls.benchmark.map((c) => c.modelKey)).toEqual([
      "onpolicy/run1/iter-1.onnx",
      "onpolicy/run1/iter-2.onnx",
    ]);
  });

  test("saves every trained model locally", async () => {
    const { deps, calls } = fakeDeps();
    await runRemoteOnPolicy(options(), deps);
    expect(calls.saved).toEqual([1, 2]);
  });

  test("reports per-iteration records and benchmark metrics", async () => {
    const { deps } = fakeDeps();
    const results = await runRemoteOnPolicy(options(), deps);
    expect(results).toEqual([
      { iteration: 1, records: 10, modelBytes: 7, winRate: 0, averageBlindsCleared: 4.1 },
      { iteration: 2, records: 20, modelBytes: 7, winRate: 0, averageBlindsCleared: 4.2 },
    ]);
  });
});
