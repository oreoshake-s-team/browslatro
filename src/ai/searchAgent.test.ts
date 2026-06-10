// @vitest-environment node
import { describe, expect, test } from "vitest";
import { createGreedyAgent } from "./agents";
import { evaluateAgent } from "./evaluateAgent";
import { playHeadlessRun, seededRng } from "./headlessRun";
import { createSearchAgent } from "./searchAgent";

describe("createSearchAgent", () => {
  test("completes a seeded run without illegal actions", () => {
    const agent = createSearchAgent({ rng: seededRng(5) });
    expect(playHeadlessRun(agent, { seed: 5 }).handsPlayed).toBeGreaterThan(0);
  });

  test("is reproducible for the same seeds", () => {
    const first = playHeadlessRun(createSearchAgent({ rng: seededRng(9) }), {
      seed: 9,
    });
    const second = playHeadlessRun(createSearchAgent({ rng: seededRng(9) }), {
      seed: 9,
    });
    expect(first).toEqual(second);
  });

  test("beats the greedy baseline over a seeded batch", { timeout: 60000 }, () => {
    const games = 12;
    const search = evaluateAgent(
      (seed) => createSearchAgent({ rng: seededRng(seed), rollouts: 4 }),
      { games },
    );
    const greedy = evaluateAgent(() => createGreedyAgent(), { games });
    expect(search.averageBlindsCleared).toBeGreaterThan(
      greedy.averageBlindsCleared,
    );
  });
});
