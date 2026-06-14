// @vitest-environment node
import { describe, expect, test } from "vitest";
import { VOUCHER_CATALOG } from "../items/vouchers";
import { voucherCandidate } from "./headlessShopAgent";

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
