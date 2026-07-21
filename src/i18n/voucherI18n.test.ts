import { describe, expect, test } from "vitest";
import { VOUCHER_CATALOG } from "../items/vouchers";
import { en } from "./locales/en";

const names: Record<string, string> = en.voucherNames;
const descriptions: Record<string, string> = en.voucherDescriptions;

describe("voucher i18n coverage", () => {
  test("every catalog voucher has an en name", () => {
    const missing = VOUCHER_CATALOG.filter(
      (voucher) => names[voucher.id] === undefined,
    ).map((voucher) => voucher.id);
    expect(missing).toEqual([]);
  });

  test("every catalog voucher has an en description", () => {
    const missing = VOUCHER_CATALOG.filter(
      (voucher) => descriptions[voucher.id] === undefined,
    ).map((voucher) => voucher.id);
    expect(missing).toEqual([]);
  });

  test("every en voucher name matches the catalog's literal name", () => {
    const mismatched = VOUCHER_CATALOG.filter(
      (voucher) => names[voucher.id] !== voucher.name,
    ).map((voucher) => voucher.id);
    expect(mismatched).toEqual([]);
  });

  test("every en voucher description matches the catalog's literal description", () => {
    const mismatched = VOUCHER_CATALOG.filter(
      (voucher) => descriptions[voucher.id] !== voucher.description,
    ).map((voucher) => voucher.id);
    expect(mismatched).toEqual([]);
  });
});
