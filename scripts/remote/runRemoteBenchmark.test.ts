// @vitest-environment node
import { describe, expect, test } from "vitest";
import {
  benchmarkEnv,
  parseBenchmark,
  resolveBenchmarkMemoryMb,
  runRemoteBenchmark,
  type BenchmarkArgs,
  type RemoteBenchmarkOptions,
} from "./runRemoteBenchmark";
import type { MachineHandle, MachineLauncher, MachineRunSpec } from "./flyMachines";

const BENCHMARK: BenchmarkArgs = {
  games: 200,
  seedOffset: 5000,
  deck: "red-deck",
  stake: "white",
  shop: true,
};

const SUMMARY_JSON = JSON.stringify({
  games: 200,
  seedOffset: 5000,
  deck: "red-deck",
  stake: "white",
  agents: [
    { label: "greedy (baseline)", result: { winRate: 0.1, averageBlindsCleared: 12.5, games: 200, wins: 20 } },
    { label: "candidate.onnx", result: { winRate: 0.2, averageBlindsCleared: 15.0, games: 200, wins: 40 } },
  ],
});

class FakeLauncher implements MachineLauncher {
  readonly launched: MachineRunSpec[] = [];
  readonly destroyed: string[] = [];

  async run(spec: MachineRunSpec): Promise<MachineHandle> {
    this.launched.push(spec);
    return { id: "bench", state: "started" };
  }

  async get(id: string): Promise<MachineHandle> {
    return { id, state: "stopped" };
  }

  async destroy(id: string): Promise<void> {
    this.destroyed.push(id);
  }
}

function options(overrides: Partial<RemoteBenchmarkOptions> = {}): RemoteBenchmarkOptions {
  return {
    runId: "run1",
    modelKey: "benchmark/run1/candidate.onnx",
    outputKey: "benchmark/run1/summary.json",
    image: "img",
    guest: { cpus: 4, memoryMb: 2048 },
    benchmark: BENCHMARK,
    workerEnv: { AWS_ACCESS_KEY_ID: "AKID" },
    pollIntervalMs: 1,
    maxWaitMs: 100,
    ...overrides,
  };
}

describe("benchmarkEnv", () => {
  test("maps benchmark args to env vars", () => {
    expect(benchmarkEnv("m.onnx", "s.json", BENCHMARK)).toMatchObject({
      MODEL_KEY: "m.onnx",
      OUTPUT_KEY: "s.json",
      GAMES: "200",
      SEED_OFFSET: "5000",
      SHOP: "1",
    });
  });

  test("omits BASELINE when unset", () => {
    expect(benchmarkEnv("m", "s", BENCHMARK).BASELINE).toBeUndefined();
  });

  test("includes BASELINE when provided", () => {
    expect(benchmarkEnv("m", "s", { ...BENCHMARK, baseline: "public/models/x.onnx" }).BASELINE).toBe(
      "public/models/x.onnx",
    );
  });

  test("flags a disabled shop", () => {
    expect(benchmarkEnv("m", "s", { ...BENCHMARK, shop: false }).SHOP).toBe("0");
  });

  test("omits shop-candidate env for a hand-policy candidate", () => {
    const env = benchmarkEnv("m", "s", BENCHMARK);
    expect([env.SHOP_CANDIDATE, env.HOLD]).toEqual([undefined, undefined]);
  });

  test("maps a shop-policy candidate to the shop-candidate entrypoint mode", () => {
    const env = benchmarkEnv("m", "s", {
      ...BENCHMARK,
      shopCandidate: true,
      handModel: "public/models/advisor-policy-v9.onnx",
      hold: true,
      parallelJobs: 4,
    });
    expect(env).toMatchObject({
      SHOP_CANDIDATE: "1",
      HAND_MODEL: "public/models/advisor-policy-v9.onnx",
      HOLD: "1",
      PARALLEL_JOBS: "4",
    });
  });
});

describe("resolveBenchmarkMemoryMb", () => {
  test("scales the default memory with parallel jobs", () => {
    expect(resolveBenchmarkMemoryMb(8)).toBe(8192);
  });

  test("keeps a 2048 floor for small job counts", () => {
    expect(resolveBenchmarkMemoryMb(1)).toBe(2048);
  });

  test("passes a safe explicit memory request through unchanged", () => {
    expect(resolveBenchmarkMemoryMb(4, 4096)).toBe(4096);
  });

  test("rejects an explicit memory request the workers would OOM under", () => {
    expect(() => resolveBenchmarkMemoryMb(8, 2048)).toThrow(/unsafe for --parallel-jobs 8/);
  });

  test("accepts an explicit request exactly at the per-job floor", () => {
    expect(resolveBenchmarkMemoryMb(4, 2048)).toBe(2048);
  });
});

describe("parseBenchmark", () => {
  test("extracts per-agent metrics", () => {
    const summary = parseBenchmark(Buffer.from(SUMMARY_JSON));
    expect(summary.agents[1]).toEqual({
      label: "candidate.onnx",
      winRate: 0.2,
      averageBlindsCleared: 15.0,
      games: 200,
      wins: 40,
    });
  });

  test("throws on an empty object", () => {
    expect(() => parseBenchmark(Buffer.alloc(0))).toThrow(/empty object/);
  });

  test("throws when there are no agents", () => {
    expect(() => parseBenchmark(Buffer.from(JSON.stringify({ games: 1, seedOffset: 0, agents: [] })))).toThrow(
      /no agents/,
    );
  });

  test("throws on a missing numeric field", () => {
    const bad = JSON.stringify({
      games: 1,
      seedOffset: 0,
      deck: "red-deck",
      stake: "white",
      agents: [{ label: "x", result: { averageBlindsCleared: 1, games: 1, wins: 0 } }],
    });
    expect(() => parseBenchmark(Buffer.from(bad))).toThrow(/winRate/);
  });
});

describe("runRemoteBenchmark", () => {
  test("returns the parsed summary the machine exported", async () => {
    const launcher = new FakeLauncher();
    const summary = await runRemoteBenchmark(options(), {
      launcher,
      getArtifact: async () => Buffer.from(SUMMARY_JSON),
      sleep: async () => {},
    });
    expect(summary.agents).toHaveLength(2);
  });

  test("launches the benchmark entrypoint via a command override", async () => {
    const launcher = new FakeLauncher();
    await runRemoteBenchmark(options(), {
      launcher,
      getArtifact: async () => Buffer.from(SUMMARY_JSON),
      sleep: async () => {},
    });
    expect(launcher.launched[0].exec).toEqual(["bash", "ml/remote/benchmark-entrypoint.sh"]);
  });

  test("merges worker env into the machine launch", async () => {
    const launcher = new FakeLauncher();
    await runRemoteBenchmark(options(), {
      launcher,
      getArtifact: async () => Buffer.from(SUMMARY_JSON),
      sleep: async () => {},
    });
    expect(launcher.launched[0].env.AWS_ACCESS_KEY_ID).toBe("AKID");
  });

  test("destroys the machine after benchmarking", async () => {
    const launcher = new FakeLauncher();
    await runRemoteBenchmark(options(), {
      launcher,
      getArtifact: async () => Buffer.from(SUMMARY_JSON),
      sleep: async () => {},
    });
    expect(launcher.destroyed).toEqual(["bench"]);
  });

  test("fails fast when no summary was exported", async () => {
    const launcher = new FakeLauncher();
    await expect(
      runRemoteBenchmark(options(), {
        launcher,
        getArtifact: async () => Buffer.alloc(0),
        sleep: async () => {},
      }),
    ).rejects.toThrow(/empty object/);
  });
});
