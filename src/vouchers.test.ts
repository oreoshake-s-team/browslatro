import {
  applyShopDiscount,
  createVoucherCatalog,
  extraConsumableSlots,
  extraShopOfferSlots,
  pickVoucherForAnte,
  shopPriceDiscount,
  VOUCHER_BASE_PRICE,
  type Voucher,
  type VoucherId,
} from "./vouchers";

function rngOf(values: ReadonlyArray<number>): () => number {
  let i = 0;
  return () => {
    const v = values[i % values.length];
    i += 1;
    return v;
  };
}

describe("vouchers catalog", () => {
  test("exposes at least two vouchers", () => {
    expect(createVoucherCatalog().length).toBeGreaterThanOrEqual(2);
  });

  test("every voucher costs the base price by default", () => {
    expect(createVoucherCatalog().every((v) => v.cost === VOUCHER_BASE_PRICE)).toBe(true);
  });

  test("every voucher exposes a non-empty description", () => {
    expect(createVoucherCatalog().every((v) => v.description.length > 0)).toBe(true);
  });

  test("includes at least one voucher gated by a prerequisite", () => {
    expect(createVoucherCatalog().some((v) => Boolean(v.requires))).toBe(true);
  });
});

describe("pickVoucherForAnte", () => {
  test("returns a voucher when nothing is owned and no requires gates apply", () => {
    const picked = pickVoucherForAnte({
      ante: 1,
      ownedIds: new Set<VoucherId>(),
      rng: rngOf([0]),
    });
    expect(picked?.id).toBe("overstock");
  });

  test("is deterministic given the same rng sequence", () => {
    const args = { ante: 1, ownedIds: new Set<VoucherId>(), rng: rngOf([0]) };
    const a = pickVoucherForAnte(args);
    const b = pickVoucherForAnte({ ...args, rng: rngOf([0]) });
    expect(a?.id).toBe(b?.id);
  });

  test("skips vouchers whose prerequisite is not owned", () => {
    const catalog: ReadonlyArray<Voucher> = [
      { id: "overstock-plus", name: "Plus", description: "x", cost: 10, requires: "overstock" },
    ];
    const picked = pickVoucherForAnte({
      ante: 1,
      ownedIds: new Set<VoucherId>(),
      catalog,
      rng: rngOf([0]),
    });
    expect(picked).toBeNull();
  });

  test("includes prerequisite-gated vouchers once the prerequisite is owned", () => {
    const catalog: ReadonlyArray<Voucher> = [
      { id: "overstock-plus", name: "Plus", description: "x", cost: 10, requires: "overstock" },
    ];
    const picked = pickVoucherForAnte({
      ante: 1,
      ownedIds: new Set<VoucherId>(["overstock"]),
      catalog,
      rng: rngOf([0]),
    });
    expect(picked?.id).toBe("overstock-plus");
  });

  test("skips vouchers that are already owned", () => {
    const catalog: ReadonlyArray<Voucher> = [
      { id: "overstock", name: "Overstock", description: "x", cost: 10 },
    ];
    const picked = pickVoucherForAnte({
      ante: 1,
      ownedIds: new Set<VoucherId>(["overstock"]),
      catalog,
      rng: rngOf([0]),
    });
    expect(picked).toBeNull();
  });

  test("returns null when all catalog entries are owned", () => {
    const owned = new Set<VoucherId>(createVoucherCatalog().map((v) => v.id));
    const picked = pickVoucherForAnte({ ante: 1, ownedIds: owned, rng: rngOf([0]) });
    expect(picked).toBeNull();
  });
});

describe("extraShopOfferSlots", () => {
  test("returns 0 when no overstock voucher is owned", () => {
    expect(extraShopOfferSlots(new Set<VoucherId>())).toBe(0);
  });

  test("returns 1 when only overstock is owned", () => {
    expect(extraShopOfferSlots(new Set<VoucherId>(["overstock"]))).toBe(1);
  });

  test("returns 2 when both overstock and overstock-plus are owned", () => {
    expect(
      extraShopOfferSlots(new Set<VoucherId>(["overstock", "overstock-plus"])),
    ).toBe(2);
  });

  test("does not count overstock-plus on its own", () => {
    expect(extraShopOfferSlots(new Set<VoucherId>(["overstock-plus"]))).toBe(1);
  });
});

describe("shopPriceDiscount", () => {
  test("returns 0 when no discount voucher is owned", () => {
    expect(shopPriceDiscount(new Set<VoucherId>())).toBe(0);
  });

  test("returns 0.25 for clearance-sale alone", () => {
    expect(shopPriceDiscount(new Set<VoucherId>(["clearance-sale"]))).toBe(0.25);
  });

  test("returns 0.5 for liquidation (overrides clearance-sale, not stacked)", () => {
    expect(
      shopPriceDiscount(new Set<VoucherId>(["clearance-sale", "liquidation"])),
    ).toBe(0.5);
  });
});

describe("applyShopDiscount", () => {
  test("returns the original price when no discount applies", () => {
    expect(applyShopDiscount(5, new Set<VoucherId>())).toBe(5);
  });

  test("applies 25% off rounding up (clearance-sale, $5 → $4)", () => {
    expect(applyShopDiscount(5, new Set<VoucherId>(["clearance-sale"]))).toBe(4);
  });

  test("applies 50% off rounding up (liquidation, $5 → $3)", () => {
    expect(
      applyShopDiscount(5, new Set<VoucherId>(["clearance-sale", "liquidation"])),
    ).toBe(3);
  });

  test("never reduces a price below $1", () => {
    expect(applyShopDiscount(1, new Set<VoucherId>(["clearance-sale", "liquidation"]))).toBe(1);
  });
});

describe("extraConsumableSlots", () => {
  test("returns 0 when crystal-ball is not owned", () => {
    expect(extraConsumableSlots(new Set<VoucherId>())).toBe(0);
  });

  test("returns 1 when crystal-ball is owned", () => {
    expect(extraConsumableSlots(new Set<VoucherId>(["crystal-ball"]))).toBe(1);
  });
});
