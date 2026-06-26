// @vitest-environment node
import { describe, expect, test } from "vitest";
import {
  runRemoteTraining,
  trainingEnv,
  type RemoteTrainingOptions,
  type TrainArgs,
} from "./runRemoteTraining";
import type { MachineHandle, MachineLauncher, MachineRunSpec } from "./flyMachines";

const TRAIN: TrainArgs = { epochs: 30, shop: false, device: "cpu" };

class FakeLauncher implements MachineLauncher {
  readonly launched: MachineRunSpec[] = [];
  readonly destroyed: string[] = [];

  constructor(private readonly finalState = "stopped") {}

  async run(spec: MachineRunSpec): Promise<MachineHandle> {
    this.launched.push(spec);
    return { id: "trainer", state: "started" };
  }

  async get(id: string): Promise<MachineHandle> {
    return { id, state: this.finalState };
  }

  async destroy(id: string): Promise<void> {
    this.destroyed.push(id);
  }
}

function options(overrides: Partial<RemoteTrainingOptions> = {}): RemoteTrainingOptions {
  return {
    runId: "run1",
    datasetKey: "training/run1/dataset.jsonl",
    outputKey: "training/run1/model.onnx",
    image: "img",
    guest: { cpus: 4, memoryMb: 4096 },
    train: TRAIN,
    workerEnv: { AWS_ACCESS_KEY_ID: "AKID" },
    pollIntervalMs: 1,
    maxWaitMs: 100,
    ...overrides,
  };
}

describe("trainingEnv", () => {
  test("maps dataset, output, and train args to env vars", () => {
    expect(trainingEnv("d.jsonl", "m.onnx", TRAIN)).toEqual({
      DATASET_KEY: "d.jsonl",
      OUTPUT_KEY: "m.onnx",
      EPOCHS: "30",
      DEVICE: "cpu",
      SHOP: "0",
    });
  });

  test("flags shop training", () => {
    expect(trainingEnv("d", "m", { ...TRAIN, shop: true }).SHOP).toBe("1");
  });
});

describe("runRemoteTraining", () => {
  test("returns the model bytes the machine exported", async () => {
    const launcher = new FakeLauncher();
    const result = await runRemoteTraining(options(), {
      launcher,
      getArtifact: async () => Buffer.from("onnx-bytes"),
      sleep: async () => {},
    });
    expect(result.bytes).toBe(10);
  });

  test("merges worker env into the machine launch", async () => {
    const launcher = new FakeLauncher();
    await runRemoteTraining(options(), {
      launcher,
      getArtifact: async () => Buffer.from("x"),
      sleep: async () => {},
    });
    expect(launcher.launched[0].env.AWS_ACCESS_KEY_ID).toBe("AKID");
  });

  test("passes the training env to the machine", async () => {
    const launcher = new FakeLauncher();
    await runRemoteTraining(options(), {
      launcher,
      getArtifact: async () => Buffer.from("x"),
      sleep: async () => {},
    });
    expect(launcher.launched[0].env.DATASET_KEY).toBe("training/run1/dataset.jsonl");
  });

  test("destroys the machine after training", async () => {
    const launcher = new FakeLauncher();
    await runRemoteTraining(options(), {
      launcher,
      getArtifact: async () => Buffer.from("x"),
      sleep: async () => {},
    });
    expect(launcher.destroyed).toEqual(["trainer"]);
  });

  test("fails fast when no model was exported", async () => {
    const launcher = new FakeLauncher();
    await expect(
      runRemoteTraining(options(), {
        launcher,
        getArtifact: async () => Buffer.alloc(0),
        sleep: async () => {},
      }),
    ).rejects.toThrow(/empty object/);
  });
});
