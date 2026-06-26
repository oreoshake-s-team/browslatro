// @vitest-environment node
import { describe, expect, test } from "vitest";
import { VOUCHER_CATALOG } from "../items/vouchers";
import { buildShopDecisionLog, voucherCandidate } from "./headlessShopAgent";
import type { ShopAdviceCandidate } from "./advisor/types";
import type { ShopBuild } from "./advisor/shopEncoding";

const EMPTY_BUILD: ShopBuild = { handLevels: {}, jokers: [], deckEnhancements: {}, consumablesHeld: 0 };
const buyCandidate: ShopAdviceCandidate = {
  action: "buy",
  item: { itemType: "joker", category: "joker-mult", id: "j_test", name: "T", description: "", cost: 4 },
};

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
});

describe("buildShopDecisionLog", () => {
  const sellCandidate: ShopAdviceCandidate = {
    action: "sell",
    item: { itemType: "joker", category: "joker-mult", id: "sell:j_old:0", name: "Old", description: "", cost: -3 },
  };
  const candidates: ShopAdviceCandidate[] = [buyCandidate, { action: "leave" }];

  test("records a purchase with the chosen offer item", () => {
    const log = buildShopDecisionLog(EMPTY_BUILD, 2, 3, 10, candidates, 0);
    expect(log?.kind === "purchase" && log.item?.id).toBe("j_test");
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
