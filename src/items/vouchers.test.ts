import {
  applyShopDiscount,
  createVoucherCatalog,
  extraConsumableSlots,
  extraShopOfferSlots,
  pickVoucherForAnte,
  pickVouchersForAnte,
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

  test("a voucher in excludeIds but not ownedIds does NOT satisfy a prereq", () => {
    const catalog: ReadonlyArray<Voucher> = [
      { id: "overstock", name: "Overstock", description: "x", cost: 10 },
      { id: "overstock-plus", name: "Plus", description: "x", cost: 10, requires: "overstock" },
    ];
    // Overstock is in the shop (excluded so we don't double-list it) but
    // not actually owned. Overstock Plus must NOT be eligible.
    const picked = pickVoucherForAnte({
      ante: 1,
      ownedIds: new Set<VoucherId>(),
      excludeIds: new Set<VoucherId>(["overstock"]),
      catalog,
      rng: rngOf([0]),
    });
    expect(picked).toBeNull();
  });

  test("excludeIds defaults to ownedIds when omitted (back-compat)", () => {
    const catalog: ReadonlyArray<Voucher> = [
      { id: "overstock", name: "Overstock", description: "x", cost: 10 },
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
});

describe("pickVouchersForAnte", () => {
  test("a voucher in excludeIds but not ownedIds does NOT satisfy its upgrade's prereq", () => {
    const catalog: ReadonlyArray<Voucher> = [
      { id: "overstock", name: "Overstock", description: "x", cost: 10 },
      { id: "overstock-plus", name: "Plus", description: "x", cost: 10, requires: "overstock" },
    ];
    const picked = pickVouchersForAnte(
      {
        ante: 1,
        ownedIds: new Set<VoucherId>(),
        excludeIds: new Set<VoucherId>(["overstock"]),
        catalog,
        rng: rngOf([0]),
      },
      1,
    );
    expect(picked).toEqual([]);
  });

  test("excludeIds prevents already-shown vouchers from being picked again as duplicates", () => {
    const catalog: ReadonlyArray<Voucher> = [
      { id: "overstock", name: "Overstock", description: "x", cost: 10 },
      { id: "clearance-sale", name: "Clearance", description: "x", cost: 10 },
    ];
    const picked = pickVouchersForAnte(
      {
        ante: 1,
        ownedIds: new Set<VoucherId>(),
        excludeIds: new Set<VoucherId>(["overstock"]),
        catalog,
        rng: rngOf([0]),
      },
      1,
    );
    expect(picked.map((v) => v.id)).toEqual(["clearance-sale"]);
  });

  test("picks distinct vouchers when called for multiple slots", () => {
    const catalog: ReadonlyArray<Voucher> = [
      { id: "overstock", name: "Overstock", description: "x", cost: 10 },
      { id: "clearance-sale", name: "Clearance", description: "x", cost: 10 },
      { id: "crystal-ball", name: "Crystal", description: "x", cost: 10 },
    ];
    const picked = pickVouchersForAnte(
      {
        ante: 1,
        ownedIds: new Set<VoucherId>(),
        catalog,
        rng: rngOf([0]),
      },
      3,
    );
    const ids = picked.map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("extraShopOfferSlots", () => {
  test.each<{ owned: VoucherId[]; expected: number; label: string }>([
    { owned: [], expected: 0, label: "no overstock voucher is owned" },
    { owned: ["overstock"], expected: 1, label: "only overstock is owned" },
    { owned: ["overstock", "overstock-plus"], expected: 2, label: "both overstock and overstock-plus are owned" },
    { owned: ["overstock-plus"], expected: 1, label: "only overstock-plus is owned (does not stack on its own)" },
  ])("returns $expected when $label", ({ owned, expected }) => {
    expect(extraShopOfferSlots(new Set<VoucherId>(owned))).toBe(expected);
  });
});

describe("shopPriceDiscount", () => {
  test.each<{ owned: VoucherId[]; expected: number; label: string }>([
    { owned: [], expected: 0, label: "no discount voucher is owned" },
    { owned: ["clearance-sale"], expected: 0.25, label: "clearance-sale alone" },
    { owned: ["clearance-sale", "liquidation"], expected: 0.5, label: "liquidation (overrides clearance-sale, not stacked)" },
  ])("returns $expected for $label", ({ owned, expected }) => {
    expect(shopPriceDiscount(new Set<VoucherId>(owned))).toBe(expected);
  });
});

describe("applyShopDiscount", () => {
  test.each<{ price: number; owned: VoucherId[]; expected: number; label: string }>([
    { price: 5, owned: [], expected: 5, label: "returns the original price when no discount applies" },
    { price: 5, owned: ["clearance-sale"], expected: 4, label: "applies 25% off rounding up (clearance-sale, $5 → $4)" },
    { price: 5, owned: ["clearance-sale", "liquidation"], expected: 3, label: "applies 50% off rounding up (liquidation, $5 → $3)" },
    { price: 1, owned: ["clearance-sale", "liquidation"], expected: 1, label: "never reduces a price below $1" },
  ])("$label", ({ price, owned, expected }) => {
    expect(applyShopDiscount(price, new Set<VoucherId>(owned))).toBe(expected);
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
