// @vitest-environment node
import { describe, expect, test } from "vitest";
import { evaluateAgent } from "./evaluateAgent";
import { createGreedyAgent, createSkipAgent } from "./agents";
import { joker } from "./test-helpers";
import type {
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
