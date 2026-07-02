// @vitest-environment node
import { describe, expect, test } from "vitest";
import {
  parseCpuKind,
  runRemoteTraining,
  trainingEnv,
  type RemoteTrainingOptions,
  type TrainArgs,
} from "./runRemoteTraining";
import type { MachineHandle, MachineLauncher, MachineRunSpec } from "./flyMachines";

const TRAIN: TrainArgs = {
  epochs: 30,
  shop: false,
  device: "cpu",
  human: false,
  humanWeight: 5,
  agreements: false,
  agreementsWeight: 1,
  correctionsWeight: 5,
};

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

describe("parseCpuKind", () => {
  test("accepts shared", () => {
    expect(parseCpuKind("shared")).toBe("shared");
  });

  test("accepts performance", () => {
    expect(parseCpuKind("performance")).toBe("performance");
  });

  test("rejects an unknown cpu kind", () => {
    expect(() => parseCpuKind("turbo")).toThrow(/shared.*performance/);
  });
});

describe("trainingEnv", () => {
  test("maps dataset, output, and train args to env vars", () => {
    expect(trainingEnv("d.jsonl", "m.onnx", TRAIN)).toEqual({
      DATASET_KEY: "d.jsonl",
      OUTPUT_KEY: "m.onnx",
      EPOCHS: "30",
      DEVICE: "cpu",
      SHOP: "0",
      HUMAN: "0",
      HUMAN_WEIGHT: "5",
      AGREEMENTS: "0",
      AGREEMENTS_WEIGHT: "1",
      CORRECTIONS_WEIGHT: "5",
    });
  });

  test("flags shop training", () => {
    expect(trainingEnv("d", "m", { ...TRAIN, shop: true }).SHOP).toBe("1");
  });

  test("flags human-play merging", () => {
    expect(trainingEnv("d", "m", { ...TRAIN, human: true }).HUMAN).toBe("1");
  });

  test("maps the human weight", () => {
    expect(trainingEnv("d", "m", { ...TRAIN, human: true, humanWeight: 8 }).HUMAN_WEIGHT).toBe("8");
  });

  test("passes an uploaded human-play log key through to the worker", () => {
    expect(
      trainingEnv("d", "m", { ...TRAIN, humanKey: "training/run1/human.jsonl" }).HUMAN_KEY,
    ).toBe("training/run1/human.jsonl");
  });

  test("omits HUMAN_KEY when no log was uploaded", () => {
    expect(trainingEnv("d", "m", TRAIN).HUMAN_KEY).toBeUndefined();
  });

  test("flags baked agreements merging", () => {
    expect(trainingEnv("d", "m", { ...TRAIN, agreements: true }).AGREEMENTS).toBe("1");
  });

  test("maps the agreements weight", () => {
    expect(trainingEnv("d", "m", { ...TRAIN, agreementsWeight: 3 }).AGREEMENTS_WEIGHT).toBe("3");
  });

  test("maps the corrections weight", () => {
    expect(trainingEnv("d", "m", { ...TRAIN, correctionsWeight: 8 }).CORRECTIONS_WEIGHT).toBe("8");
  });

  test("passes an uploaded corrections key through to the worker", () => {
    expect(
      trainingEnv("d", "m", { ...TRAIN, correctionsKey: "training/run1/corrections.jsonl" })
        .CORRECTIONS_KEY,
    ).toBe("training/run1/corrections.jsonl");
  });

  test("passes an uploaded agreements key through to the worker", () => {
    expect(
      trainingEnv("d", "m", { ...TRAIN, agreementsKey: "training/run1/agreements.jsonl" })
        .AGREEMENTS_KEY,
    ).toBe("training/run1/agreements.jsonl");
  });

  test("omits CORRECTIONS_KEY when no corrections were uploaded", () => {
    expect(trainingEnv("d", "m", TRAIN).CORRECTIONS_KEY).toBeUndefined();
  });

  test("omits AGREEMENTS_KEY when no agreements log was uploaded", () => {
    expect(trainingEnv("d", "m", TRAIN).AGREEMENTS_KEY).toBeUndefined();
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
