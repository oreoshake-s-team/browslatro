import { describe, expect, test } from "vitest";
import { candidatesFixture, modelStateFixture } from "../src/ai/advisor/test-helpers";
import type { HandOption } from "../src/ai/getHandOptions";
import {
  benchmarkArgs,
  formatVerdict,
  localBestPlayTeacher,
  parseAvgBlinds,
  shipVerdict,
  trainArgs,
  type DistillConfig,
} from "./distillPolicy";

function config(overrides: Partial<DistillConfig> = {}): DistillConfig {
  return {
    base: "ml/base.jsonl",
    model: "public/models/advisor-policy-v5.onnx",
    teacherOut: "ml/teacher-labels.jsonl",
    candidateOut: "ml/candidate.onnx",
    teacherWeight: 5,
    minScoreFraction: 0.25,
    epochs: 30,
    games: 200,
    seedOffset: 5000,
    limit: 0,
    python: "python3",
    ...overrides,
  };
}

const SAMPLE_BENCHMARK = [
  "200 games per agent, seeds 5000..5199",
  "model                        winRate  avgAnte  avgBlinds   avgHands",
  "greedy (baseline)              0.010     2.40       2.90      18.20",
  "advisor-policy-v5.onnx         0.030     3.10       3.06      19.10",
  "candidate.onnx                 0.040     3.20       3.18      19.40",
  "done in 42.0s",
].join("\n");

describe("trainArgs", () => {
  test("passes the teacher source at its weight", () => {
    expect(trainArgs(config({ teacherWeight: 7 }))).toEqual([
      "ml/train.py",
      "ml/base.jsonl",
      "--teacher",
      "ml/teacher-labels.jsonl",
      "--teacher-weight",
      "7",
      "--epochs",
      "30",
      "--out",
      "ml/candidate.onnx",
    ]);
  });
});

describe("benchmarkArgs", () => {
  test("compares the current model against the candidate over the eval seeds", () => {
    expect(benchmarkArgs(config())).toEqual([
      "scripts/benchmarkPolicy.ts",
      "public/models/advisor-policy-v5.onnx",
      "ml/candidate.onnx",
      "--games",
      "200",
      "--seed-offset",
      "5000",
    ]);
  });
});

describe("parseAvgBlinds", () => {
  test("reads the avgBlinds column for the current model", () => {
    expect(parseAvgBlinds(SAMPLE_BENCHMARK, "advisor-policy-v5.onnx")).toBe(3.06);
  });

  test("reads the avgBlinds column for the candidate", () => {
    expect(parseAvgBlinds(SAMPLE_BENCHMARK, "candidate.onnx")).toBe(3.18);
  });

  test("returns null when the label is absent", () => {
    expect(parseAvgBlinds(SAMPLE_BENCHMARK, "advisor-policy-v9.onnx")).toBeNull();
  });
});

describe("shipVerdict", () => {
  test("ships when the candidate beats the baseline", () => {
    expect(shipVerdict(3.06, 3.18).ship).toBe(true);
  });

  test("holds when the candidate does not beat the baseline", () => {
    expect(shipVerdict(3.06, 3.06).ship).toBe(false);
  });

  test("reports the delta", () => {
    expect(shipVerdict(3.0, 3.25).delta).toBeCloseTo(0.25);
  });
});

describe("formatVerdict", () => {
  test("renders a SHIP line with the delta", () => {
    const line = formatVerdict(shipVerdict(3.06, 3.18), "v5", "candidate");
    expect(line).toContain("+0.12, SHIP");
  });

  test("renders a HOLD line for a regression", () => {
    const line = formatVerdict(shipVerdict(3.2, 3.0), "v5", "candidate");
    expect(line).toContain("-0.20, HOLD");
  });
});

describe("localBestPlayTeacher", () => {
  function plays(scores: ReadonlyArray<number>): ReadonlyArray<HandOption> {
    return scores.map((score, i) => ({
      action: "play",
      cardIds: [i + 1],
      handLabel: "Pair",
      score,
      chips: score,
      mult: 1,
      notes: [],
    }));
  }

  test("picks the highest-scoring play", async () => {
    const teacher = localBestPlayTeacher();
    expect(await teacher(modelStateFixture(), plays([10, 80, 30]))).toBe(1);
  });

  test("returns a valid index for the default fixture", async () => {
    const teacher = localBestPlayTeacher();
    const index = await teacher(modelStateFixture(), candidatesFixture());
    expect(index).toBe(0);
  });
});
