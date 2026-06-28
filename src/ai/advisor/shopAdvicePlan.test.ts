// @vitest-environment node
import { describe, expect, test } from "vitest";
import type { Consumable } from "../../items/consumables";
import { createPlusFourMultJoker } from "../../items/jokers/factories";
import { createPlanetCatalog } from "../../items/planets";
import { createTarotCatalog } from "../../items/tarots";
import type { ShopItem } from "../../items/shop";

function planetConsumable(): Consumable {
  return { kind: "planet", card: createPlanetCatalog()[0] };
}

function targetTarot(): Consumable {
  const card = createTarotCatalog().find((t) => t.effect.kind === "convert-suit");
  if (card === undefined) throw new Error("expected a convert-suit tarot");
  return { kind: "tarot", card };
}
import { applyShopDiscount, type Voucher } from "../../items/vouchers";
import {
  buildShopAdvicePlan,
  type ShopAdviceInput,
} from "./shopAdvicePlan";
import { MAX_CANDIDATES, parseAdviceRequest } from "./types";

function jokerOffer(overrides: Partial<{ price: number; sold: boolean }> = {}): ShopItem {
  return {
    kind: "joker",
    joker: createPlusFourMultJoker(),
    price: 5,
    sold: false,
    ...overrides,
  };
}

function planetOffer(): ShopItem {
  return {
    kind: "planet",
    planet: createPlanetCatalog()[0],
    price: 3,
    sold: false,
  };
}

function voucherFixture(): Voucher {
  return {
    id: "overstock",
    name: "Overstock",
    description: "+1 additional shop offer slot.",
    cost: 10,
  };
}

function inputFixture(overrides: Partial<ShopAdviceInput> = {}): ShopAdviceInput {
  return {
    money: 30,
    ante: 2,
    jokers: [],
    consumables: [],
    equippedJokerCount: 0,
    jokerCapacity: 5,
    consumableCount: 0,
    consumableCapacity: 2,
    offers: [jokerOffer()],
    vouchers: [],
    soldVoucherIds: new Set(),
    ownedVoucherIds: new Set(),
    rerollCost: 5,
    ...overrides,
  };
}

describe("buildShopAdvicePlan", () => {
  test("includes an affordable offer as a buy candidate", () => {
    const plan = buildShopAdvicePlan(inputFixture());
    expect(plan?.request.candidates[0]).toMatchObject({ action: "buy" });
  });

  test("maps the buy candidate to its offer index", () => {
    const plan = buildShopAdvicePlan(
      inputFixture({ offers: [jokerOffer({ sold: true }), jokerOffer()] }),
    );
    expect(plan?.actions[0]).toEqual({ kind: "buy", offerIdx: 1 });
  });

  test("excludes sold offers", () => {
    const plan = buildShopAdvicePlan(
      inputFixture({ offers: [jokerOffer({ sold: true })] }),
    );
    expect(plan?.actions.some((action) => action.kind === "buy")).toBe(false);
  });

  test("excludes unaffordable offers", () => {
    const plan = buildShopAdvicePlan(
      inputFixture({ money: 30, rerollCost: 5, offers: [jokerOffer({ price: 35 })] }),
    );
    expect(plan?.actions.some((action) => action.kind === "buy")).toBe(false);
  });

  test("excludes joker offers when joker slots are full", () => {
    const plan = buildShopAdvicePlan(
      inputFixture({ equippedJokerCount: 5, jokerCapacity: 5 }),
    );
    expect(plan?.actions.some((action) => action.kind === "buy")).toBe(false);
  });

  test("excludes consumable offers when consumable slots are full", () => {
    const plan = buildShopAdvicePlan(
      inputFixture({
        offers: [planetOffer()],
        consumableCount: 2,
        consumableCapacity: 2,
      }),
    );
    expect(plan?.actions.some((action) => action.kind === "buy")).toBe(false);
  });

  test("excludes consumable offers below the $20 economy threshold", () => {
    const plan = buildShopAdvicePlan(
      inputFixture({ money: 15, offers: [planetOffer(), jokerOffer()] }),
    );
    expect(plan?.actions.filter((action) => action.kind === "buy").length).toBe(1);
  });

  test("includes consumable offers once at the $20 economy threshold", () => {
    const plan = buildShopAdvicePlan(
      inputFixture({ money: 20, offers: [planetOffer(), jokerOffer()] }),
    );
    expect(plan?.actions.filter((action) => action.kind === "buy").length).toBe(2);
  });

  test("includes an affordable voucher as a buy-voucher action", () => {
    const plan = buildShopAdvicePlan(
      inputFixture({ offers: [], vouchers: [voucherFixture()] }),
    );
    expect(plan?.actions[0]).toEqual({ kind: "buy-voucher", voucherIdx: 0 });
  });

  test("excludes a voucher whose prerequisite is not owned", () => {
    const locked: Voucher = {
      id: "overstock-plus",
      name: "Overstock Plus",
      description: "+1 additional shop offer slot.",
      cost: 10,
      requires: "overstock",
    };
    const plan = buildShopAdvicePlan(
      inputFixture({ offers: [], vouchers: [locked] }),
    );
    expect(plan?.actions.some((action) => action.kind === "buy-voucher")).toBe(
      false,
    );
  });

  test("excludes a sold voucher", () => {
    const plan = buildShopAdvicePlan(
      inputFixture({
        offers: [],
        vouchers: [voucherFixture()],
        soldVoucherIds: new Set(["overstock"]),
      }),
    );
    expect(plan?.actions.some((action) => action.kind === "buy-voucher")).toBe(
      false,
    );
  });

  test("includes the reroll candidate with its cost when affordable", () => {
    const plan = buildShopAdvicePlan(inputFixture({ money: 30, rerollCost: 5 }));
    expect(plan?.request.candidates).toContainEqual({
      action: "reroll",
      cost: 5,
    });
  });

  test("generates a use candidate for a held consumable", () => {
    const plan = buildShopAdvicePlan(inputFixture({ consumables: [planetConsumable()] }));
    expect(plan?.actions.some((a) => a.kind === "use-consumable")).toBe(true);
  });

  test("marks a no-target consumable as not requiring targets", () => {
    const plan = buildShopAdvicePlan(inputFixture({ consumables: [planetConsumable()] }));
    const use = plan?.actions.find((a) => a.kind === "use-consumable");
    expect(use?.kind === "use-consumable" && use.requiresTargets).toBe(false);
  });

  test("marks a target-requiring consumable as requiring targets", () => {
    const plan = buildShopAdvicePlan(inputFixture({ consumables: [targetTarot()] }));
    const use = plan?.actions.find((a) => a.kind === "use-consumable");
    expect(use?.kind === "use-consumable" && use.requiresTargets).toBe(true);
  });

  test("excludes the reroll candidate when unaffordable", () => {
    const plan = buildShopAdvicePlan(
      inputFixture({ money: 5, rerollCost: 6 }),
    );
    expect(plan?.actions.some((action) => action.kind === "reroll")).toBe(false);
  });

  test("excludes the reroll candidate below the $30 threshold even when affordable", () => {
    const plan = buildShopAdvicePlan(inputFixture({ money: 20, rerollCost: 5 }));
    expect(plan?.actions.some((action) => action.kind === "reroll")).toBe(false);
  });

  test("includes the reroll candidate below $30 when a reroll voucher is owned", () => {
    const plan = buildShopAdvicePlan(
      inputFixture({
        money: 10,
        rerollCost: 5,
        ownedVoucherIds: new Set(["reroll-surplus"]),
      }),
    );
    expect(plan?.actions.some((action) => action.kind === "reroll")).toBe(true);
  });

  test("always puts leave last", () => {
    const plan = buildShopAdvicePlan(inputFixture());
    expect(plan?.request.candidates.at(-1)).toEqual({ action: "leave" });
  });

  test("returns null when leaving is the only legal action", () => {
    const plan = buildShopAdvicePlan(
      inputFixture({ money: 0, offers: [jokerOffer()], rerollCost: 5 }),
    );
    expect(plan).toBeNull();
  });

  test("applies the owned-voucher discount to offer costs", () => {
    const owned = new Set<"clearance-sale">(["clearance-sale"]);
    const plan = buildShopAdvicePlan(
      inputFixture({ ownedVoucherIds: owned }),
    );
    const buy = plan?.request.candidates[0];
    if (buy?.action !== "buy") throw new Error("expected a buy candidate");
    expect(buy.item.cost).toBe(applyShopDiscount(5, owned));
  });

  test("caps the candidate list at the contract maximum", () => {
    const offers = Array.from({ length: MAX_CANDIDATES + 3 }, () => jokerOffer());
    const plan = buildShopAdvicePlan(inputFixture({ offers }));
    expect(plan?.request.candidates).toHaveLength(MAX_CANDIDATES);
  });

  test("produces a request the server-side parser accepts", () => {
    const plan = buildShopAdvicePlan(
      inputFixture({
        jokers: [createPlusFourMultJoker()],
        consumables: [{ kind: "planet", card: createPlanetCatalog()[0] }],
        vouchers: [voucherFixture()],
      }),
    );
    expect(plan && parseAdviceRequest(plan.request)).not.toBeNull();
  });

  test("carries the snapshot of held jokers in the request state", () => {
    const joker = createPlusFourMultJoker();
    const plan = buildShopAdvicePlan(inputFixture({ jokers: [joker] }));
    expect(plan?.request.shop.jokers).toEqual([
      { id: joker.id, name: joker.name },
    ]);
  });
});
