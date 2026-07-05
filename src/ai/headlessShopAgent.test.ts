// @vitest-environment node
import { describe, expect, test } from "vitest";
import type { Consumable } from "../items/consumables";
import { createPlusFourMultJoker } from "../items/jokers/factories";
import { createPlanetCatalog } from "../items/planets";
import { VOUCHER_CATALOG } from "../items/vouchers";
import { createDefaultHandStats } from "../scoring/handStats";
import {
  buildShopDecisionLog,
  consumableUseCandidate,
  consumablesHeldFeature,
  createHeadlessShopAgent,
  voucherCandidate,
} from "./headlessShopAgent";
import type { ShopView } from "./headlessRun";
import type { ShopAdviceCandidate } from "./advisor/types";
import type { ShopBuild } from "./advisor/shopEncoding";

const SHOP_MODEL = "public/models/advisor-shop-policy-v13.onnx";

function planetConsumable(): Consumable {
  return { kind: "planet", card: createPlanetCatalog()[0] };
}

function shopViewWithJoker(): ShopView {
  return {
    ante: 2,
    round: 4,
    money: 10,
    jokers: [createPlusFourMultJoker()],
    handStats: createDefaultHandStats(),
    deck: [],
    ownedVoucherIds: new Set(),
    lastConsumable: null,
    rng: () => 0.5,
  };
}

const EMPTY_BUILD: ShopBuild = { handLevels: {}, jokers: [], deckEnhancements: {}, consumablesHeld: 0 };
const buyCandidate: ShopAdviceCandidate = {
  action: "buy",
  item: { itemType: "joker", category: "joker-mult", id: "j_test", name: "T", description: "", cost: 4 },
};

describe("holdConsumables", () => {
  test("runs the shop loop end to end with the v2 encoder", async () => {
    const agent = await createHeadlessShopAgent(SHOP_MODEL, {
      holdConsumables: true,
      scoreCandidates: (_encoded, n) => new Float32Array(n),
    });
    const result = await agent.buyAfterRound(shopViewWithJoker());
    expect(result.money).toBeLessThanOrEqual(10);
  });

  test("never offers a use candidate while the inventory is empty", async () => {
    const widths: number[] = [];
    const agent = await createHeadlessShopAgent(SHOP_MODEL, {
      holdConsumables: true,
      scoreCandidates: (encoded, n, featureCount) => {
        for (let i = 0; i < n; i++) {
          widths.push(encoded[i * featureCount + (featureCount - 1)]);
        }
        return new Float32Array(n).fill(0);
      },
    });
    await agent.buyAfterRound({ ...shopViewWithJoker(), jokers: [], money: 0 });
    expect(widths.every((flag) => flag === 0)).toBe(true);
  });
});

describe("consumablesHeldFeature", () => {
  test("in hold mode reports the held inventory count", () => {
    expect(consumablesHeldFeature(true, 2, null)).toBe(2);
  });

  test("in hold mode reports zero for an empty inventory", () => {
    expect(consumablesHeldFeature(true, 0, planetConsumable())).toBe(0);
  });

  test("without hold reports one when a consumable was used", () => {
    expect(consumablesHeldFeature(false, 0, planetConsumable())).toBe(1);
  });

  test("without hold reports zero when no consumable was used", () => {
    expect(consumablesHeldFeature(false, 0, null)).toBe(0);
  });

  test("without hold ignores the inventory count", () => {
    expect(consumablesHeldFeature(false, 2, null)).toBe(0);
  });
});

describe("consumableUseCandidate", () => {
  test("builds a use candidate carrying the consumable item type", () => {
    const candidate = consumableUseCandidate(planetConsumable(), 0);
    expect(candidate.action === "use" && candidate.item.itemType).toBe("planet");
  });

  test("encodes the inventory index into the candidate id", () => {
    const candidate = consumableUseCandidate(planetConsumable(), 1);
    expect(candidate.action === "use" && candidate.item.id.endsWith(":1")).toBe(
      true,
    );
  });
});

describe("voucherCandidate", () => {
  const wasteful = VOUCHER_CATALOG.find((v) => v.id === "wasteful");

  test("builds a buy candidate with the voucher item type", () => {
    expect(wasteful).toBeDefined();
    if (wasteful === undefined) return;
    const candidate = voucherCandidate(wasteful);
    expect(candidate.action === "buy" && candidate.item.itemType).toBe("voucher");
  });

  test("carries the voucher id and cost", () => {
    if (wasteful === undefined) return;
    const candidate = voucherCandidate(wasteful);
    expect(candidate.action === "buy" && candidate.item.id).toBe("wasteful");
  });

  test("carries a non-zero voucher feature vector", () => {
    if (wasteful === undefined) return;
    const candidate = voucherCandidate(wasteful);
    const features =
      candidate.action === "buy" ? candidate.item.voucherFeatures : undefined;
    expect(features?.some((v) => v !== 0)).toBe(true);
  });
});

describe("buildShopDecisionLog", () => {
  const sellCandidate: ShopAdviceCandidate = {
    action: "sell",
    item: { itemType: "joker", category: "joker-mult", id: "sell:j_old:0", name: "Old", description: "", cost: -3 },
  };
  const candidates: ShopAdviceCandidate[] = [buyCandidate, { action: "leave" }];
  const useCandidate: ShopAdviceCandidate = {
    action: "use",
    item: { itemType: "tarot", category: "tarot-deck", id: "use:c_star:0", name: "The Star", description: "", cost: 0 },
  };

  test("records a purchase with the chosen offer item", () => {
    const log = buildShopDecisionLog(EMPTY_BUILD, 2, 3, 10, candidates, 0);
    expect(log?.kind === "purchase" && log.item?.id).toBe("j_test");
  });

  test("in hold mode records a use decision kind", () => {
    const withUse: ShopAdviceCandidate[] = [buyCandidate, useCandidate, { action: "leave" }];
    const log = buildShopDecisionLog(EMPTY_BUILD, 2, 3, 10, withUse, 1, true);
    expect(log?.kind).toBe("use");
  });

  test("in hold mode logs the full ordered candidate list with the use flag", () => {
    const withUse: ShopAdviceCandidate[] = [buyCandidate, useCandidate, { action: "leave" }];
    const log = buildShopDecisionLog(EMPTY_BUILD, 2, 3, 10, withUse, 1, true);
    expect(log?.candidates?.map((c) => c.isUse)).toEqual([false, true, false]);
  });

  test("in hold mode records the chosen index", () => {
    const withUse: ShopAdviceCandidate[] = [buyCandidate, useCandidate, { action: "leave" }];
    const log = buildShopDecisionLog(EMPTY_BUILD, 2, 3, 10, withUse, 1, true);
    expect(log?.chosenIndex).toBe(1);
  });

  test("records a leave as a purchase with a null item", () => {
    const log = buildShopDecisionLog(EMPTY_BUILD, 2, 3, 10, candidates, 1);
    expect(log?.kind === "purchase" && log.item).toBeNull();
  });

  test("records a reroll with its cost", () => {
    const withReroll: ShopAdviceCandidate[] = [buyCandidate, { action: "reroll", cost: 6 }, { action: "leave" }];
    const log = buildShopDecisionLog(EMPTY_BUILD, 2, 3, 10, withReroll, 1);
    expect(log?.kind === "reroll" && log.cost).toBe(6);
  });

  test("logs a voucher buy as a purchase", () => {
    const voucher = VOUCHER_CATALOG.find((v) => v.id === "wasteful");
    if (voucher === undefined) return;
    const withVoucher: ShopAdviceCandidate[] = [buyCandidate, voucherCandidate(voucher), { action: "leave" }];
    const log = buildShopDecisionLog(EMPTY_BUILD, 2, 3, 10, withVoucher, 1);
    expect(log?.kind === "purchase" && log.item?.id).toBe("wasteful");
  });

  test("logs a sell as a purchase with the sell item", () => {
    const withSell: ShopAdviceCandidate[] = [buyCandidate, sellCandidate, { action: "leave" }];
    const log = buildShopDecisionLog(EMPTY_BUILD, 2, 3, 10, withSell, 1);
    expect(log?.kind === "purchase" && log.item?.id).toBe("sell:j_old:0");
  });

  test("includes sell and voucher candidates in the logged offers", () => {
    const voucher = VOUCHER_CATALOG.find((v) => v.id === "wasteful");
    if (voucher === undefined) return;
    const all: ShopAdviceCandidate[] = [buyCandidate, sellCandidate, voucherCandidate(voucher), { action: "leave" }];
    const log = buildShopDecisionLog(EMPTY_BUILD, 2, 3, 10, all, 0);
    expect(log?.offers.map((o) => o.id)).toEqual(["j_test", "sell:j_old:0", "wasteful"]);
  });
});

describe("buildOverride", () => {
  test("receives the player's real build before encoding", async () => {
    const seen: ShopBuild[] = [];
    const agent = await createHeadlessShopAgent(SHOP_MODEL, {
      scoreCandidates: (_encoded, n) => new Float32Array(n),
      buildOverride: (build) => {
        seen.push(build);
        return build;
      },
    });
    await agent.buyAfterRound(shopViewWithJoker());
    expect(seen[0]?.jokers).toHaveLength(1);
  });

  test("substitutes the transformed build into the decision log", async () => {
    const logs: Array<ReadonlyArray<unknown>> = [];
    const agent = await createHeadlessShopAgent(SHOP_MODEL, {
      scoreCandidates: (_encoded, n) => new Float32Array(n),
      buildOverride: () => EMPTY_BUILD,
      onShopDecision: (log) => logs.push(log.jokers),
    });
    await agent.buyAfterRound(shopViewWithJoker());
    expect(logs[0]).toHaveLength(0);
  });
});

describe("chooseShopAction override", () => {
  test("routes the shop decision through the override instead of the ranker", async () => {
    const seen: number[] = [];
    const agent = await createHeadlessShopAgent(SHOP_MODEL, {
      holdConsumables: true,
      scoreCandidates: () => {
        throw new Error("ranker must not be consulted when chooseShopAction is set");
      },
      chooseShopAction: async ({ candidates }) => {
        seen.push(candidates.length);
        return candidates.findIndex((c) => c.action === "leave");
      },
    });
    await agent.buyAfterRound(shopViewWithJoker());
    expect(seen.length).toBeGreaterThan(0);
  });
});
