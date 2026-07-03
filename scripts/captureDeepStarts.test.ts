// @vitest-environment node
import { describe, expect, test } from "vitest";
import { capturingShopAgent } from "./captureDeepStarts";
import type { HeadlessShopAgent, ShopView } from "../src/ai/headlessRun";
import type { DeepRunStart } from "../src/ai/deepRunStarts";
import { createJokerCatalog } from "../src/items/jokers";
import { createDefaultHandStats } from "../src/scoring/handStats";

function view(ante: number, jokerCount = 1): ShopView {
  return {
    ante,
    round: ante * 3,
    money: 10,
    jokers: createJokerCatalog().slice(0, jokerCount),
    handStats: createDefaultHandStats(),
    deck: [],
    ownedVoucherIds: new Set(),
    lastConsumable: null,
    rng: () => 0.5,
  };
}

function fakeInner(): { agent: HeadlessShopAgent; calls: number[] } {
  const calls: number[] = [];
  return {
    agent: {
      async buyAfterRound(v: ShopView) {
        calls.push(v.ante);
        return { money: v.money, jokers: v.jokers, handStats: v.handStats };
      },
    },
    calls,
  };
}

describe("capturingShopAgent", () => {
  test("captures the build at the first shop at or past the ante threshold", async () => {
    const { agent } = fakeInner();
    const captured: DeepRunStart[] = [];
    const capturing = capturingShopAgent(agent, 5, (s) => captured.push(s));
    await capturing.buyAfterRound(view(4));
    await capturing.buyAfterRound(view(5));
    expect(captured.map((s) => s.ante)).toEqual([5]);
  });

  test("captures only once per agent even across deeper shops", async () => {
    const { agent } = fakeInner();
    const captured: DeepRunStart[] = [];
    const capturing = capturingShopAgent(agent, 5, (s) => captured.push(s));
    await capturing.buyAfterRound(view(5));
    await capturing.buyAfterRound(view(6));
    expect(captured).toHaveLength(1);
  });

  test("skips jokerless builds", async () => {
    const { agent } = fakeInner();
    const captured: DeepRunStart[] = [];
    const capturing = capturingShopAgent(agent, 5, (s) => captured.push(s));
    await capturing.buyAfterRound(view(6, 0));
    expect(captured).toHaveLength(0);
  });

  test("delegates every shop visit to the inner agent unchanged", async () => {
    const { agent, calls } = fakeInner();
    const capturing = capturingShopAgent(agent, 5, () => {});
    await capturing.buyAfterRound(view(1));
    await capturing.buyAfterRound(view(5));
    expect(calls).toEqual([1, 5]);
  });
});
