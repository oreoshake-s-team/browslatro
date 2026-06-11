// @vitest-environment node
import { describe, expect, test } from "vitest";
import { createGreedyAgent } from "./agents";
import { evaluateAgent } from "./evaluateAgent";
import { playHeadlessRun, seededRng } from "./headlessRun";
import { createSearchAgent } from "./searchAgent";

describe("createSearchAgent", () => {
  test("completes a seeded run without illegal actions", async () => {
    const agent = createSearchAgent({ rng: seededRng(5) });
    const result = await playHeadlessRun(agent, { seed: 5 });
    expect(result.handsPlayed).toBeGreaterThan(0);
  });

  test("is reproducible for the same seeds", async () => {
    const first = await playHeadlessRun(createSearchAgent({ rng: seededRng(9) }), {
      seed: 9,
    });
    const second = await playHeadlessRun(createSearchAgent({ rng: seededRng(9) }), {
      seed: 9,
    });
    expect(first).toEqual(second);
  });

  test("beats the greedy baseline over a seeded batch", { timeout: 60000 }, async () => {
    const games = 12;
    const search = await evaluateAgent(
      (seed) => createSearchAgent({ rng: seededRng(seed), rollouts: 4 }),
      { games },
    );
    const greedy = await evaluateAgent(() => createGreedyAgent(), { games });
    expect(search.averageBlindsCleared).toBeGreaterThan(
      greedy.averageBlindsCleared,
    );
  });
});
