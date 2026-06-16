// @vitest-environment node
import { describe, expect, test } from "vitest";
import { buildHeadlessDeck, seededRng, type ShopView } from "./headlessRun";
import { createJokerStackingShopAgent } from "./rolloutShopAgent";
import { joker } from "./test-helpers";
import { MAX_JOKERS } from "../items/jokers/constants";
import { createDefaultHandStats } from "../scoring/handStats";
import type { Joker } from "../items/jokers/types";

function view(overrides: Partial<ShopView> = {}): ShopView {
  return {
    ante: 2,
    round: 3,
    money: 100,
    jokers: [],
    handStats: createDefaultHandStats(),
    deck: buildHeadlessDeck(),
    ownedVoucherIds: new Set(),
    lastConsumable: null,
    rng: seededRng(17),
    ...overrides,
  };
}

describe("createJokerStackingShopAgent", () => {
  test("acquires jokers when money and slots allow", async () => {
    const agent = createJokerStackingShopAgent();
    const result = await agent.buyAfterRound(view());
    expect(result.jokers.length).toBeGreaterThan(0);
  });

  test("spends money on the jokers it buys", async () => {
    const agent = createJokerStackingShopAgent();
    const result = await agent.buyAfterRound(view({ money: 100 }));
    expect(result.money).toBeLessThan(100);
  });

  test("buys nothing when the joker slots are already full (negative)", async () => {
    const full: Joker[] = Array.from({ length: MAX_JOKERS }, (_, i) => joker({ id: `owned-${i}` }));
    const agent = createJokerStackingShopAgent();
    const result = await agent.buyAfterRound(view({ jokers: full }));
    expect(result.jokers.length).toBe(MAX_JOKERS);
  });

  test("buys nothing when there is no money (negative)", async () => {
    const agent = createJokerStackingShopAgent();
    const result = await agent.buyAfterRound(view({ money: 0 }));
    expect(result.jokers.length).toBe(0);
  });
});
