// @vitest-environment node
import { describe, expect, test } from "vitest";
import { createDefaultHandStats } from "../scoring/handStats";
import { createPlusFourMultJoker } from "../items/jokers/factories";
import type { ShopItem } from "../items/shop";
import {
  DEFAULT_SHOP_GATE,
  gateShopCorrections,
  isShopCorrectionJustified,
  type ShopGateDeps,
} from "./shopCorrectionGate";
import {
  RUN_EVENT_SCHEMA_VERSION,
  shopItemSnapshot,
  type RunEventRecord,
} from "./runEvents";
import type { PostShopState, RolloutOptions } from "./shopRolloutExpert";

const OFFER: ShopItem = {
  kind: "joker",
  joker: createPlusFourMultJoker(),
  price: 5,
  sold: false,
};
const OFFER_ID = shopItemSnapshot(OFFER, OFFER.price).id;

const OPTS = {} as RolloutOptions;

function fakeDeps(args: {
  bestValue: number;
  leaveValue: number;
  buyValue: number;
  affordable?: boolean;
}): ShopGateDeps {
  return {
    bestShopChoice: async () => ({
      index: 0,
      bestValue: args.bestValue,
      leaveValue: args.leaveValue,
    }),
    rolloutValue: async () => args.buyValue,
    applyOfferToState: (_o, s): PostShopState | null =>
      args.affordable === false ? null : s,
  };
}

function shopCorrection(
  correctedIndex: number,
  rollout: boolean = true,
): RunEventRecord {
  return {
    schemaVersion: RUN_EVENT_SCHEMA_VERSION,
    kind: "advice-feedback",
    runSeed: 7,
    ante: 2,
    round: 3,
    blind: 0,
    money: 8,
    advisorKind: "policy",
    model: "advisor-shop-policy-v2",
    recommendationIndex: 0,
    alternativeIndex: null,
    verdict: "bad",
    correctedIndex,
    source: "explicit",
    decision: {
      context: "shop",
      state: {
        money: 8,
        ante: 2,
        jokers: [],
        jokerCapacity: 5,
        consumables: [],
        consumableCapacity: 2,
        ownedVoucherIds: [],
      },
      candidates: [
        {
          action: "buy",
          item: {
            itemType: "joker",
            category: "joker-mult",
            id: OFFER_ID,
            name: "J",
            description: "",
            cost: 5,
          },
        },
        { action: "reroll", cost: 5 },
        { action: "leave" },
        {
          action: "buy",
          item: {
            itemType: "joker",
            category: "joker-mult",
            id: "not-an-offer",
            name: "X",
            description: "",
            cost: 5,
          },
        },
      ],
      ...(rollout
        ? {
            rollout: {
              jokers: [],
              handStats: createDefaultHandStats(),
              deck: [],
              offers: [OFFER],
            },
          }
        : {}),
    },
  } as RunEventRecord;
}

describe("isShopCorrectionJustified", () => {
  test("keeps a buy whose rolled-out value clears the fraction", async () => {
    const deps = fakeDeps({ bestValue: 10, leaveValue: 4, buyValue: 5 });
    expect(
      await isShopCorrectionJustified(shopCorrection(0), OPTS, DEFAULT_SHOP_GATE, deps),
    ).toBe(true);
  });

  test("drops a buy whose rolled-out value is well below the best", async () => {
    const deps = fakeDeps({ bestValue: 10, leaveValue: 4, buyValue: 1 });
    expect(
      await isShopCorrectionJustified(shopCorrection(0), OPTS, DEFAULT_SHOP_GATE, deps),
    ).toBe(false);
  });

  test("gates a leave correction by the leave value", async () => {
    const deps = fakeDeps({ bestValue: 10, leaveValue: 1, buyValue: 9 });
    expect(
      await isShopCorrectionJustified(shopCorrection(2), OPTS, DEFAULT_SHOP_GATE, deps),
    ).toBe(false);
  });

  test("keeps a reroll correction (can't value a reroll)", async () => {
    const deps = fakeDeps({ bestValue: 10, leaveValue: 0, buyValue: 0 });
    expect(
      await isShopCorrectionJustified(shopCorrection(1), OPTS, DEFAULT_SHOP_GATE, deps),
    ).toBe(true);
  });

  test("keeps a correction whose record carries no rollout state", async () => {
    const deps = fakeDeps({ bestValue: 10, leaveValue: 0, buyValue: 0 });
    expect(
      await isShopCorrectionJustified(
        shopCorrection(0, false),
        OPTS,
        DEFAULT_SHOP_GATE,
        deps,
      ),
    ).toBe(true);
  });

  test("keeps a buy that matches no offer (e.g. a voucher)", async () => {
    const deps = fakeDeps({ bestValue: 10, leaveValue: 0, buyValue: 0 });
    expect(
      await isShopCorrectionJustified(shopCorrection(3), OPTS, DEFAULT_SHOP_GATE, deps),
    ).toBe(true);
  });

  test("keeps everything when the best value is non-positive", async () => {
    const deps = fakeDeps({ bestValue: 0, leaveValue: 0, buyValue: 0 });
    expect(
      await isShopCorrectionJustified(shopCorrection(2), OPTS, DEFAULT_SHOP_GATE, deps),
    ).toBe(true);
  });
});

describe("gateShopCorrections", () => {
  test("filters the dropped corrections out of the list", async () => {
    const deps = fakeDeps({ bestValue: 10, leaveValue: 4, buyValue: 1 });
    const kept = await gateShopCorrections(
      [shopCorrection(0), shopCorrection(1)],
      OPTS,
      DEFAULT_SHOP_GATE,
      deps,
    );
    expect(kept).toHaveLength(1);
  });
});
