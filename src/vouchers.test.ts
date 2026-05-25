import {
  createVoucherCatalog,
  pickVoucherForAnte,
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
