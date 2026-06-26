// @vitest-environment node
import { describe, expect, test } from "vitest";
import {
  runRemoteDataset,
  shardEnv,
  type GenerateArgs,
  type RemoteDatasetOptions,
} from "./runRemoteDataset";
import type { MachineHandle, MachineLauncher, MachineRunSpec } from "./flyMachines";

const GENERATE: GenerateArgs = {
  rollouts: 4,
  topN: 3,
  maxAnte: 8,
  deck: "red-deck",
  stake: "white",
  jokerLoadoutFraction: 0,
};

class FakeLauncher implements MachineLauncher {
  readonly launched: MachineRunSpec[] = [];
  readonly destroyed: string[] = [];
  private counter = 0;

  constructor(private readonly finalState = "stopped") {}

  async run(spec: MachineRunSpec): Promise<MachineHandle> {
    this.launched.push(spec);
    this.counter += 1;
    return { id: `m${this.counter}`, state: "started" };
  }

  async get(id: string): Promise<MachineHandle> {
    return { id, state: this.finalState };
  }

  async destroy(id: string): Promise<void> {
    this.destroyed.push(id);
  }
}

function options(overrides: Partial<RemoteDatasetOptions> = {}): RemoteDatasetOptions {
  return {
    runId: "run1",
    totalGames: 4,
    machines: 2,
    image: "img",
    guest: { cpus: 2, memoryMb: 1024 },
    generate: GENERATE,
    workerEnv: { AWS_ACCESS_KEY_ID: "AKID" },
    pollIntervalMs: 1,
    maxWaitMs: 100,
    ...overrides,
  };
}

function shardStore(entries: Record<string, string>): (key: string) => Promise<Buffer> {
  return async (key: string) => {
    const value = entries[key];
    if (value === undefined) throw new Error(`unexpected key ${key}`);
    return Buffer.from(value);
  };
}

describe("shardEnv", () => {
  test("maps generate args and shard placement to env vars", () => {
    const env = shardEnv(
      { index: 1, games: 7, seedOffset: 12, outputKey: "datasets/run1/shard-1.jsonl" },
      GENERATE,
    );
    expect(env).toMatchObject({
      OUTPUT_KEY: "datasets/run1/shard-1.jsonl",
      GAMES: "7",
      SEED_OFFSET: "12",
      DECK: "red-deck",
    });
  });

  test("omits SHOP_POLICY when unset", () => {
    const env = shardEnv(
      { index: 0, games: 1, seedOffset: 0, outputKey: "k" },
      GENERATE,
    );
    expect(env.SHOP_POLICY).toBeUndefined();
  });

  test("includes SHOP_POLICY when provided", () => {
    const env = shardEnv(
      { index: 0, games: 1, seedOffset: 0, outputKey: "k" },
      { ...GENERATE, shopPolicy: "models/shop.onnx" },
    );
    expect(env.SHOP_POLICY).toBe("models/shop.onnx");
  });
});

describe("runRemoteDataset", () => {
  test("launches one machine per shard and concatenates their outputs in order", async () => {
    const launcher = new FakeLauncher();
    const getShard = shardStore({
      "datasets/run1/shard-0.jsonl": "a\nb",
      "datasets/run1/shard-1.jsonl": "c\nd",
    });
    const result = await runRemoteDataset(options(), {
      launcher,
      getShard,
      sleep: async () => {},
    });
    expect(launcher.launched).toHaveLength(2);
    expect(result.records).toBe(4);
    expect(result.dataset.toString("utf8")).toBe("a\nb\nc\nd\n");
  });

  test("merges worker env into every machine launch", async () => {
    const launcher = new FakeLauncher();
    const getShard = shardStore({
      "datasets/run1/shard-0.jsonl": "a",
      "datasets/run1/shard-1.jsonl": "b",
    });
    await runRemoteDataset(options(), { launcher, getShard, sleep: async () => {} });
    expect(launcher.launched[0].env.AWS_ACCESS_KEY_ID).toBe("AKID");
  });

  test("destroys every machine it launched", async () => {
    const launcher = new FakeLauncher();
    const getShard = shardStore({
      "datasets/run1/shard-0.jsonl": "a",
      "datasets/run1/shard-1.jsonl": "b",
    });
    await runRemoteDataset(options(), { launcher, getShard, sleep: async () => {} });
    expect(launcher.destroyed).toEqual(["m1", "m2"]);
  });

  test("fails fast when a shard object is empty", async () => {
    const launcher = new FakeLauncher();
    const getShard = shardStore({
      "datasets/run1/shard-0.jsonl": "a",
      "datasets/run1/shard-1.jsonl": "",
    });
    await expect(
      runRemoteDataset(options(), { launcher, getShard, sleep: async () => {} }),
    ).rejects.toThrow(/empty object/);
  });

  test("times out when a machine never reaches a terminal state", async () => {
    const launcher = new FakeLauncher("started");
    const getShard = shardStore({});
    await expect(
      runRemoteDataset(options({ maxWaitMs: 3, pollIntervalMs: 1 }), {
        launcher,
        getShard,
        sleep: async () => {},
      }),
    ).rejects.toThrow(/did not finish within/);
  });
});
