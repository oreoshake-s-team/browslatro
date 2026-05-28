import { beforeEach, describe, expect, test } from "vitest";
import { useGame } from "./game";
import type { VoucherId } from "../items/vouchers";

describe("vouchers store", () => {
  beforeEach(() => {
    useGame.getState().resetVouchers();
  });

  test("starts with no owned vouchers", () => {
    expect(useGame.getState().ownedVoucherIds.size).toBe(0);
  });

  test("seeds the current ante voucher offering", () => {
    expect(useGame.getState().currentAnteVouchers.length).toBeGreaterThan(0);
  });

  test("setCurrentAnteVouchers accepts a plain value", () => {
    useGame.getState().setCurrentAnteVouchers([]);
    expect(useGame.getState().currentAnteVouchers).toHaveLength(0);
  });

  test("setOwnedVoucherIds accepts a plain value", () => {
    useGame.getState().setOwnedVoucherIds(new Set<VoucherId>(["overstock"]));
    expect(useGame.getState().ownedVoucherIds.has("overstock")).toBe(true);
  });

  test("setSoldVoucherIds accepts an updater function", () => {
    useGame.getState().setSoldVoucherIds((prev) => {
      const next = new Set(prev);
      next.add("overstock");
      return next;
    });
    expect(useGame.getState().soldVoucherIds.has("overstock")).toBe(true);
  });

  test("setExtraVoucherSlots accepts an updater function", () => {
    useGame.getState().setExtraVoucherSlots((prev) => prev + 2);
    expect(useGame.getState().extraVoucherSlots).toBe(2);
  });

  test("resetVouchers clears owned vouchers", () => {
    useGame.getState().setOwnedVoucherIds(new Set<VoucherId>(["overstock"]));
    useGame.getState().resetVouchers();
    expect(useGame.getState().ownedVoucherIds.size).toBe(0);
  });

  test("resetVouchers restores the base voucher slot count", () => {
    useGame.getState().setExtraVoucherSlots(3);
    useGame.getState().resetVouchers();
    expect(useGame.getState().extraVoucherSlots).toBe(0);
  });
});
