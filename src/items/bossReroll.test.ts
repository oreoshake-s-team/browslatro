import { describe, expect, test } from "vitest";
import {
  BOSS_REROLL_COST,
  bossRerollsAllowedPerAnte,
  bossRerollsRemaining,
  VOUCHER_CATALOG,
  type VoucherId,
} from "./vouchers";

function ownedSet(ids: ReadonlyArray<VoucherId>): ReadonlySet<VoucherId> {
  return new Set(ids);
}

describe("Director's Cut + Retcon catalog entries", () => {
  test("the catalog contains directors-cut", () => {
    expect(VOUCHER_CATALOG.some((v) => v.id === "directors-cut")).toBe(true);
  });

  test("the catalog contains retcon", () => {
    expect(VOUCHER_CATALOG.some((v) => v.id === "retcon")).toBe(true);
  });

  test("retcon requires directors-cut", () => {
    const retcon = VOUCHER_CATALOG.find((v) => v.id === "retcon");
    expect(retcon?.requires).toBe("directors-cut");
  });

  test("BOSS_REROLL_COST is $10 to match Balatro semantics", () => {
    expect(BOSS_REROLL_COST).toBe(10);
  });
});

describe("bossRerollsAllowedPerAnte", () => {
  test("returns 0 with no vouchers owned", () => {
    expect(bossRerollsAllowedPerAnte(ownedSet([]))).toBe(0);
  });

  test("returns 1 with directors-cut only", () => {
    expect(bossRerollsAllowedPerAnte(ownedSet(["directors-cut"]))).toBe(1);
  });

  test("returns Infinity with retcon", () => {
    expect(bossRerollsAllowedPerAnte(ownedSet(["directors-cut", "retcon"]))).toBe(
      Number.POSITIVE_INFINITY,
    );
  });
});

describe("bossRerollsRemaining", () => {
  test("returns 0 when nothing is owned", () => {
    expect(bossRerollsRemaining(ownedSet([]), 0)).toBe(0);
  });

  test("returns 1 with directors-cut and 0 used", () => {
    expect(bossRerollsRemaining(ownedSet(["directors-cut"]), 0)).toBe(1);
  });

  test("returns 0 with directors-cut and 1 used", () => {
    expect(bossRerollsRemaining(ownedSet(["directors-cut"]), 1)).toBe(0);
  });

  test("never goes negative even if used exceeds allowed", () => {
    expect(bossRerollsRemaining(ownedSet(["directors-cut"]), 5)).toBe(0);
  });

  test("returns Infinity with retcon regardless of usage", () => {
    expect(
      bossRerollsRemaining(ownedSet(["directors-cut", "retcon"]), 99),
    ).toBe(Number.POSITIVE_INFINITY);
  });
});
