// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, test } from "vitest";
import { createGreedyAgent } from "./agents";
import { evaluateAgent } from "./evaluateAgent";
import { playHeadlessRun } from "./headlessRun";
import { loadPolicyRanker, type CandidateRanker } from "./policy";
import { createPolicyAgent } from "./policyAgent";

const MODEL_PATH = join(
  __dirname,
  "..",
  "..",
  "public",
  "models",
  "advisor-policy-v8.onnx",
);

let ranker: CandidateRanker;

beforeAll(async () => {
  ranker = await loadPolicyRanker(readFileSync(MODEL_PATH));
});

describe("createPolicyAgent", () => {
  test("completes a seeded run without illegal actions", async () => {
    const result = await playHeadlessRun(createPolicyAgent(ranker), {
      seed: 17,
    });
    expect(result.handsPlayed).toBeGreaterThan(0);
  });

  test("is reproducible for the same seed", async () => {
    const first = await playHeadlessRun(createPolicyAgent(ranker), { seed: 4 });
    const second = await playHeadlessRun(createPolicyAgent(ranker), {
      seed: 4,
    });
    expect(first).toEqual(second);
  });

  test(
    "beats the greedy baseline over a seeded batch",
    { timeout: 120000 },
    async () => {
      const games = 12;
      const policy = await evaluateAgent(() => createPolicyAgent(ranker), {
        games,
      });
      const greedy = await evaluateAgent(() => createGreedyAgent(), { games });
      expect(policy.averageBlindsCleared).toBeGreaterThan(
        greedy.averageBlindsCleared,
      );
    },
  );
});
