import { describe, expect, test } from "vitest";
import { VOUCHER_CATALOG, type Voucher } from "../../items/vouchers";
import {
  VOUCHER_FEATURES,
  ZERO_VOUCHER_FEATURES,
  voucherFeatureVector,
} from "./voucherFeatures";

function voucher(id: string): Voucher {
  const found = VOUCHER_CATALOG.find((v) => v.id === id);
  if (found === undefined) throw new Error(`unknown voucher ${id}`);
  return found;
}

describe("voucherFeatureVector", () => {
  test("has VOUCHER_FEATURES entries", () => {
    expect(voucherFeatureVector(voucher("overstock"))).toHaveLength(
      VOUCHER_FEATURES,
    );
  });

  test("the Blank voucher (does nothing) encodes to all zeros", () => {
    expect(voucherFeatureVector(voucher("blank"))).toEqual([
      ...ZERO_VOUCHER_FEATURES,
    ]);
  });

  test("a shop-slot voucher encodes to a non-zero vector", () => {
    expect(voucherFeatureVector(voucher("overstock"))).not.toEqual([
      ...ZERO_VOUCHER_FEATURES,
    ]);
  });

  test("Overstock sets the shop-offer-slot signal to 0.5", () => {
    expect(voucherFeatureVector(voucher("overstock"))[0]).toBeCloseTo(0.5);
  });

  test("Money Tree maxes the interest-cap signal", () => {
    expect(voucherFeatureVector(voucher("money-tree"))[4]).toBeCloseTo(1);
  });

  test("distinct vouchers encode to distinct vectors", () => {
    expect(voucherFeatureVector(voucher("overstock"))).not.toEqual(
      voucherFeatureVector(voucher("grabber")),
    );
  });
});

describe("ZERO_VOUCHER_FEATURES", () => {
  test("has VOUCHER_FEATURES zero entries", () => {
    expect(ZERO_VOUCHER_FEATURES).toEqual(new Array(VOUCHER_FEATURES).fill(0));
  });
});
