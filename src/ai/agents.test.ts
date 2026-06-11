// @vitest-environment node
import { describe, expect, test } from "vitest";
import { createGreedyAgent, createRandomAgent } from "./agents";
import { evaluateAgent } from "./evaluateAgent";
import { playHeadlessRun, seededRng } from "./headlessRun";
import { joker } from "./test-helpers";

describe("createRandomAgent", () => {
  test("completes a seeded run without illegal actions", async () => {
    const result = await playHeadlessRun(createRandomAgent(seededRng(99)), {
      seed: 99,
    });
    expect(result.handsPlayed).toBeGreaterThan(0);
  });

  test("is reproducible for the same agent seed and run seed", async () => {
    const first = await playHeadlessRun(createRandomAgent(seededRng(7)), { seed: 7 });
    const second = await playHeadlessRun(createRandomAgent(seededRng(7)), {
      seed: 7,
    });
    expect(first).toEqual(second);
  });
});

describe("createGreedyAgent", () => {
  test("completes a seeded run without illegal actions", async () => {
    const result = await playHeadlessRun(createGreedyAgent(), { seed: 99 });
    expect(result.handsPlayed).toBeGreaterThan(0);
  });
});

describe("evaluateAgent", () => {
  test("rejects a non-positive game count", async () => {
    await expect(
      evaluateAgent(() => createGreedyAgent(), { games: 0 }),
    ).rejects.toThrow("games must be positive");
  });

  test("is deterministic for identical configs", async () => {
    const config = { games: 10 };
    const first = await evaluateAgent((seed) => createRandomAgent(seededRng(seed)), config);
    const second = await evaluateAgent((seed) => createRandomAgent(seededRng(seed)), config);
    expect(first).toEqual(second);
  });

  test("reports the win rate as wins over games", async () => {
    const result = await evaluateAgent(() => createGreedyAgent(), {
      games: 5,
      maxAnte: 1,
      jokers: [joker({ effect: { kind: "additive-mult", amount: 100000 } })],
    });
    expect(result).toMatchObject({ games: 5, wins: 5, winRate: 1 });
  });

  test("greedy clears more blinds than random over a seeded batch", async () => {
    const games = 30;
    const greedy = await evaluateAgent(() => createGreedyAgent(), { games });
    const random = await evaluateAgent(
      (seed) => createRandomAgent(seededRng(seed)),
      { games },
    );
    expect(greedy.averageBlindsCleared).toBeGreaterThan(
      random.averageBlindsCleared,
    );
  });

  test("reports the agent name", async () => {
    const result = await evaluateAgent(() => createGreedyAgent(), { games: 1 });
    expect(result.agentName).toBe("greedy");
  });
});
