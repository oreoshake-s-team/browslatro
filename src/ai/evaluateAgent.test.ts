// @vitest-environment node
import { describe, expect, test } from "vitest";
import { aggregateRunResults, evaluateAgent } from "./evaluateAgent";
import { createGreedyAgent, createSkipAgent } from "./agents";
import { joker } from "./test-helpers";
import { emptyShopActivity } from "./shopActivity";
import type {
  HeadlessRunResult,
  HeadlessShopAgent,
  ShopResult,
  ShopView,
} from "./headlessRun";

const powerJoker = joker({ effect: { kind: "additive-mult", amount: 100000 } });

describe("evaluateAgent", () => {
  test("rejects a non-positive game count", async () => {
    await expect(
      evaluateAgent(() => createGreedyAgent(), { games: 0 }),
    ).rejects.toThrow("games must be positive");
  });

  test("reports the average blinds skipped by a skip expert", async () => {
    const result = await evaluateAgent(
      () => createSkipAgent(createGreedyAgent(), () => true),
      { games: 3, maxAnte: 1, jokers: [powerJoker] },
    );
    expect(result.averageBlindsSkipped).toBe(2);
  });

  test("reports the requested number of games", async () => {
    const result = await evaluateAgent(() => createGreedyAgent(), {
      games: 3,
      maxAnte: 1,
    });
    expect(result.games).toBe(3);
  });

  test("passes the shop agent through to each headless run", async () => {
    const visited: number[] = [];
    const shopAgent: HeadlessShopAgent = {
      async buyAfterRound(view: ShopView): Promise<ShopResult> {
        visited.push(view.ante);
        return { jokers: view.jokers, money: view.money, handStats: view.handStats };
      },
    };
    await evaluateAgent(() => createGreedyAgent(), {
      games: 2,
      maxAnte: 1,
      jokers: [powerJoker],
      shopAgent,
    });
    expect(visited.length).toBeGreaterThan(0);
  });

  test("applies the configured deck's starting-money delta before the shop", async () => {
    const firstShopMoney = async (deck: "red-deck" | "yellow-deck"): Promise<number> => {
      let captured = -1;
      const shopAgent: HeadlessShopAgent = {
        async buyAfterRound(view: ShopView): Promise<ShopResult> {
          if (captured === -1) captured = view.money;
          return { jokers: view.jokers, money: view.money, handStats: view.handStats };
        },
      };
      await evaluateAgent(() => createGreedyAgent(), {
        games: 1,
        maxAnte: 1,
        jokers: [powerJoker],
        deck,
        shopAgent,
      });
      return captured;
    };
    const red = await firstShopMoney("red-deck");
    const yellow = await firstShopMoney("yellow-deck");
    expect(yellow - red).toBe(12);
  });

  test("reports a final-money distribution", async () => {
    const result = await evaluateAgent(() => createGreedyAgent(), {
      games: 3,
      maxAnte: 1,
      jokers: [powerJoker],
    });
    expect(result.finalMoney.mean).toBeGreaterThan(0);
  });

  test("counts runs that reached the final ante", async () => {
    const result = await evaluateAgent(() => createGreedyAgent(), {
      games: 3,
      maxAnte: 1,
      jokers: [powerJoker],
    });
    expect(result.reachedFinalAnte).toBe(3);
  });

  test("reports the win-rate standard error", async () => {
    const result = await evaluateAgent(() => createGreedyAgent(), {
      games: 3,
      maxAnte: 1,
      jokers: [powerJoker],
    });
    expect(result.winRateStdErr).toBe(0);
  });

  test("aggregates shop activity reported by the shop agent", async () => {
    const shopAgent: HeadlessShopAgent = {
      async buyAfterRound(view: ShopView): Promise<ShopResult> {
        return {
          jokers: view.jokers,
          money: view.money,
          handStats: view.handStats,
          activity: {
            rerolls: 0,
            jokersBought: 1,
            consumablesBought: 0,
            vouchersBought: 0,
            jokersSold: 0,
            packsOpened: 0,
            packPicks: 0,
            moneySpent: 0,
          },
        };
      },
    };
    const result = await evaluateAgent(() => createGreedyAgent(), {
      games: 2,
      maxAnte: 1,
      jokers: [powerJoker],
      shopAgent,
    });
    expect(result.shopActivity.jokersBought).toBe(3);
  });

  test("defaults shop activity to zero when the shop agent omits it", async () => {
    const shopAgent: HeadlessShopAgent = {
      async buyAfterRound(view: ShopView): Promise<ShopResult> {
        return { jokers: view.jokers, money: view.money, handStats: view.handStats };
      },
    };
    const result = await evaluateAgent(() => createGreedyAgent(), {
      games: 2,
      maxAnte: 1,
      jokers: [powerJoker],
      shopAgent,
    });
    expect(result.shopActivity.jokersBought).toBe(0);
  });

  test("leaves the shop agent untouched when it is not configured (negative)", async () => {
    let calls = 0;
    const shopAgent: HeadlessShopAgent = {
      async buyAfterRound(view: ShopView): Promise<ShopResult> {
        calls += 1;
        return { jokers: view.jokers, money: view.money, handStats: view.handStats };
      },
    };
    await evaluateAgent(() => createGreedyAgent(), {
      games: 2,
      maxAnte: 1,
      jokers: [powerJoker],
      shopAgent,
    });
    const callsWithAgent = calls;
    calls = 0;
    await evaluateAgent(() => createGreedyAgent(), {
      games: 2,
      maxAnte: 1,
      jokers: [powerJoker],
    });
    expect(calls).toBe(0);
    expect(callsWithAgent).toBeGreaterThan(0);
  });
});

function runResult(over: Partial<HeadlessRunResult>): HeadlessRunResult {
  return {
    won: false,
    anteReached: 1,
    blindsCleared: 1,
    handsPlayed: 4,
    blindsSkipped: 0,
    finalMoney: 4,
    shopActivity: emptyShopActivity(),
    ...over,
  };
}

const sample: HeadlessRunResult[] = [
  runResult({ won: true, anteReached: 8, blindsCleared: 24, finalMoney: 30 }),
  runResult({ anteReached: 2, blindsCleared: 4 }),
  runResult({ anteReached: 3, blindsCleared: 6, finalMoney: 12 }),
  runResult({ anteReached: 1, blindsCleared: 0 }),
  runResult({ anteReached: 2, blindsCleared: 5, finalMoney: 8 }),
];

describe("aggregateRunResults", () => {
  test("counts games as the size of the merged results", () => {
    expect(aggregateRunResults("a", sample, 8).games).toBe(5);
  });

  test("computes win rate over the merged results", () => {
    expect(aggregateRunResults("a", sample, 8).winRate).toBe(0.2);
  });

  test("aggregating concatenated shards equals aggregating the whole", () => {
    const whole = aggregateRunResults("a", sample, 8);
    const sharded = aggregateRunResults("a", [...sample.slice(0, 2), ...sample.slice(2)], 8);
    expect(sharded).toEqual(whole);
  });

  test("merged shards in a different order aggregate identically (partition invariance)", () => {
    const whole = aggregateRunResults("a", sample, 8);
    const reordered = aggregateRunResults("a", [...sample.slice(3), ...sample.slice(0, 3)], 8);
    expect(reordered.blindsCleared).toEqual(whole.blindsCleared);
  });
});
