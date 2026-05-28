import { beforeEach, describe, expect, test } from "vitest";
import { useVouchers } from "./vouchers";
import type { VoucherId } from "../items/vouchers";

describe("vouchers store", () => {
  beforeEach(() => {
    useVouchers.getState().resetVouchers();
  });

  test("starts with no owned vouchers", () => {
    expect(useVouchers.getState().ownedVoucherIds.size).toBe(0);
  });

  test("setOwnedVoucherIds accepts a plain value", () => {
    useVouchers.getState().setOwnedVoucherIds(new Set<VoucherId>(["overstock"]));
    expect(useVouchers.getState().ownedVoucherIds.has("overstock")).toBe(true);
  });

  test("setSoldVoucherIds accepts an updater function", () => {
    useVouchers.getState().setSoldVoucherIds((prev) => {
      const next = new Set(prev);
      next.add("overstock");
      return next;
    });
    expect(useVouchers.getState().soldVoucherIds.has("overstock")).toBe(true);
  });

  test("setExtraVoucherSlots accepts an updater function", () => {
    useVouchers.getState().setExtraVoucherSlots((prev) => prev + 2);
    expect(useVouchers.getState().extraVoucherSlots).toBe(2);
  });

  test("resetVouchers clears owned vouchers", () => {
    useVouchers.getState().setOwnedVoucherIds(new Set<VoucherId>(["overstock"]));
    useVouchers.getState().resetVouchers();
    expect(useVouchers.getState().ownedVoucherIds.size).toBe(0);
  });

  test("resetVouchers restores the base voucher slot count", () => {
    useVouchers.getState().setExtraVoucherSlots(3);
    useVouchers.getState().resetVouchers();
    expect(useVouchers.getState().extraVoucherSlots).toBe(0);
  });
});
