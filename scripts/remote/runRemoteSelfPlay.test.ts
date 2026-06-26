// @vitest-environment node
import { describe, expect, test } from "vitest";
import {
  runRemoteSelfPlay,
  selfPlayShardEnv,
  type RemoteSelfPlayOptions,
  type SelfPlayArgs,
} from "./runRemoteSelfPlay";
import type { MachineHandle, MachineLauncher, MachineRunSpec } from "./flyMachines";

const SELF_PLAY: SelfPlayArgs = {
  shopModel: "public/models/advisor-shop-policy-v9.onnx",
  handModel: "public/models/advisor-policy-v9.onnx",
  temperature: 1,
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

function options(overrides: Partial<RemoteSelfPlayOptions> = {}): RemoteSelfPlayOptions {
  return {
    runId: "run1",
    totalGames: 4,
    machines: 2,
    image: "img",
    guest: { cpus: 2, memoryMb: 1024 },
    selfPlay: SELF_PLAY,
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

describe("selfPlayShardEnv", () => {
  test("maps self-play args and shard placement to env vars", () => {
    const env = selfPlayShardEnv(
      { index: 1, games: 7, seedOffset: 12, outputKey: "selfplay/run1/shard-1.jsonl" },
      SELF_PLAY,
    );
    expect(env).toMatchObject({
      OUTPUT_KEY: "selfplay/run1/shard-1.jsonl",
      GAMES: "7",
      SEED_OFFSET: "12",
      SHOP_MODEL: "public/models/advisor-shop-policy-v9.onnx",
      HAND_MODEL: "public/models/advisor-policy-v9.onnx",
      TEMPERATURE: "1",
    });
  });
});

describe("runRemoteSelfPlay", () => {
  test("concatenates per-shard outputs in order under the selfplay key prefix", async () => {
    const launcher = new FakeLauncher();
    const getShard = shardStore({
      "selfplay/run1/shard-0.jsonl": "a\nb",
      "selfplay/run1/shard-1.jsonl": "c\nd",
    });
    const result = await runRemoteSelfPlay(options(), {
      launcher,
      getShard,
      sleep: async () => {},
    });
    expect(result.dataset.toString("utf8")).toBe("a\nb\nc\nd\n");
  });

  test("counts every decision across shards", async () => {
    const launcher = new FakeLauncher();
    const getShard = shardStore({
      "selfplay/run1/shard-0.jsonl": "a\nb",
      "selfplay/run1/shard-1.jsonl": "c\nd",
    });
    const result = await runRemoteSelfPlay(options(), { launcher, getShard, sleep: async () => {} });
    expect(result.records).toBe(4);
  });

  test("overrides the worker command to the self-play entrypoint", async () => {
    const launcher = new FakeLauncher();
    const getShard = shardStore({
      "selfplay/run1/shard-0.jsonl": "a",
      "selfplay/run1/shard-1.jsonl": "b",
    });
    await runRemoteSelfPlay(options(), { launcher, getShard, sleep: async () => {} });
    expect(launcher.launched[0].exec).toEqual(["bash", "ml/remote/selfplay-entrypoint.sh"]);
  });

  test("merges worker env into every machine launch", async () => {
    const launcher = new FakeLauncher();
    const getShard = shardStore({
      "selfplay/run1/shard-0.jsonl": "a",
      "selfplay/run1/shard-1.jsonl": "b",
    });
    await runRemoteSelfPlay(options(), { launcher, getShard, sleep: async () => {} });
    expect(launcher.launched[0].env.AWS_ACCESS_KEY_ID).toBe("AKID");
  });

  test("destroys every machine it launched", async () => {
    const launcher = new FakeLauncher();
    const getShard = shardStore({
      "selfplay/run1/shard-0.jsonl": "a",
      "selfplay/run1/shard-1.jsonl": "b",
    });
    await runRemoteSelfPlay(options(), { launcher, getShard, sleep: async () => {} });
    expect(launcher.destroyed).toEqual(["m1", "m2"]);
  });

  test("fails fast when a shard object is empty", async () => {
    const launcher = new FakeLauncher();
    const getShard = shardStore({
      "selfplay/run1/shard-0.jsonl": "a",
      "selfplay/run1/shard-1.jsonl": "",
    });
    await expect(
      runRemoteSelfPlay(options(), { launcher, getShard, sleep: async () => {} }),
    ).rejects.toThrow(/empty object/);
  });

  test("times out when a machine never reaches a terminal state", async () => {
    const launcher = new FakeLauncher("started");
    const getShard = shardStore({});
    await expect(
      runRemoteSelfPlay(options({ maxWaitMs: 3, pollIntervalMs: 1 }), {
        launcher,
        getShard,
        sleep: async () => {},
      }),
    ).rejects.toThrow(/did not finish within/);
  });
});
