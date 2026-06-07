import {
  OBSERVATORY_MULT_PER_PLANET,
  applyShopDiscount,
  createVoucherCatalog,
  extraConsumableSlots,
  extraHandSize,
  extraJokerSlots,
  extraShopOfferSlots,
  extraStartingDiscards,
  extraStartingHands,
  illusionEnabled,
  interestCapFor,
  magicTrickEnabled,
  observatoryMultFor,
  offerKindWeights,
  pickVoucherForAnte,
  pickVouchersForAnte,
  rerollCostReduction,
  shopPriceDiscount,
  tarotToSpectralSwapChance,
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

  test("includes the Hieroglyph voucher with no prerequisite", () => {
    const voucher = createVoucherCatalog().find((v) => v.id === "hieroglyph");
    expect(voucher?.requires).toBeUndefined();
  });

  test("Petroglyph requires Hieroglyph", () => {
    const voucher = createVoucherCatalog().find((v) => v.id === "petroglyph");
    expect(voucher?.requires).toBe("hieroglyph");
  });

  test("includes the Omen Globe voucher gated by Crystal Ball", () => {
    const voucher = createVoucherCatalog().find((v) => v.id === "omen-globe");
    expect(voucher?.requires).toBe("crystal-ball");
  });
});

describe("tarotToSpectralSwapChance", () => {
  test("returns 0 when Omen Globe is not owned", () => {
    expect(tarotToSpectralSwapChance(new Set<VoucherId>())).toBe(0);
  });

  test("returns 0.2 when Omen Globe is owned", () => {
    expect(
      tarotToSpectralSwapChance(new Set<VoucherId>(["omen-globe"])),
    ).toBe(0.2);
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

describe("rerollCostReduction", () => {
  test("returns 0 with no reroll vouchers", () => {
    expect(rerollCostReduction(new Set<VoucherId>())).toBe(0);
  });

  test("Reroll Surplus reduces reroll cost by $2", () => {
    expect(rerollCostReduction(new Set<VoucherId>(["reroll-surplus"]))).toBe(2);
  });

  test("Reroll Surplus + Reroll Glut reduces reroll cost by $4", () => {
    expect(
      rerollCostReduction(new Set<VoucherId>(["reroll-surplus", "reroll-glut"])),
    ).toBe(4);
  });
});

describe("interestCapFor", () => {
  test("defaults to $5", () => {
    expect(interestCapFor(new Set<VoucherId>())).toBe(5);
  });

  test("Seed Money raises the cap to $10", () => {
    expect(interestCapFor(new Set<VoucherId>(["seed-money"]))).toBe(10);
  });

  test("Money Tree raises the cap to $20", () => {
    expect(
      interestCapFor(new Set<VoucherId>(["seed-money", "money-tree"])),
    ).toBe(20);
  });
});

describe("extraStartingHands", () => {
  test("returns 0 without Grabber or Nacho Tong", () => {
    expect(extraStartingHands(new Set<VoucherId>())).toBe(0);
  });

  test("Grabber alone grants +1 hand", () => {
    expect(extraStartingHands(new Set<VoucherId>(["grabber"]))).toBe(1);
  });

  test("Grabber + Nacho Tong stack to +2 hands", () => {
    expect(
      extraStartingHands(new Set<VoucherId>(["grabber", "nacho-tong"])),
    ).toBe(2);
  });

  test("Hieroglyph alone subtracts 1 hand per round", () => {
    expect(extraStartingHands(new Set<VoucherId>(["hieroglyph"]))).toBe(-1);
  });

  test("Hieroglyph offsets Grabber so the net delta is 0", () => {
    expect(
      extraStartingHands(new Set<VoucherId>(["grabber", "hieroglyph"])),
    ).toBe(0);
  });
});

describe("extraStartingDiscards", () => {
  test("Wasteful + Recyclomancy stack to +2 discards", () => {
    expect(
      extraStartingDiscards(new Set<VoucherId>(["wasteful", "recyclomancy"])),
    ).toBe(2);
  });

  test("returns 0 without Wasteful", () => {
    expect(extraStartingDiscards(new Set<VoucherId>())).toBe(0);
  });

  test("Petroglyph alone subtracts 1 discard per round", () => {
    expect(extraStartingDiscards(new Set<VoucherId>(["petroglyph"]))).toBe(-1);
  });

  test("Petroglyph offsets Wasteful so the net delta is 0", () => {
    expect(
      extraStartingDiscards(new Set<VoucherId>(["wasteful", "petroglyph"])),
    ).toBe(0);
  });
});

describe("extraHandSize", () => {
  test("Paint Brush + Palette stack to +2 hand size", () => {
    expect(
      extraHandSize(new Set<VoucherId>(["paint-brush", "palette"])),
    ).toBe(2);
  });

  test("returns 0 without Paint Brush", () => {
    expect(extraHandSize(new Set<VoucherId>())).toBe(0);
  });
});

describe("extraJokerSlots", () => {
  test("Antimatter grants +1 joker slot", () => {
    expect(extraJokerSlots(new Set<VoucherId>(["antimatter"]))).toBe(1);
  });

  test("Blank alone grants 0 slots (it's a prereq with no effect)", () => {
    expect(extraJokerSlots(new Set<VoucherId>(["blank"]))).toBe(0);
  });
});

describe("Telescope / Observatory voucher catalog (#281)", () => {
  test("Telescope is in the catalog with no prerequisite", () => {
    const telescope = createVoucherCatalog().find((v) => v.id === "telescope");
    expect(telescope?.requires).toBeUndefined();
  });

  test("Observatory is in the catalog and requires Telescope", () => {
    const observatory = createVoucherCatalog().find(
      (v) => v.id === "observatory",
    );
    expect(observatory?.requires).toBe("telescope");
  });

  test("Telescope description mentions most-played hand", () => {
    const telescope = createVoucherCatalog().find((v) => v.id === "telescope");
    expect(telescope?.description).toMatch(/most-played/);
  });

  test("Observatory description mentions ×1.5 Mult", () => {
    const observatory = createVoucherCatalog().find(
      (v) => v.id === "observatory",
    );
    expect(observatory?.description).toMatch(/1\.5/);
  });
});

describe("observatoryMultFor (#281)", () => {
  test("returns 1 when Observatory is not owned", () => {
    expect(observatoryMultFor(new Set<VoucherId>(), 3)).toBe(1);
  });

  test("returns 1 when no held planet matches the played hand (negative)", () => {
    expect(observatoryMultFor(new Set<VoucherId>(["observatory"]), 0)).toBe(1);
  });

  test("returns ×1.5 for a single matching planet", () => {
    expect(observatoryMultFor(new Set<VoucherId>(["observatory"]), 1)).toBe(
      OBSERVATORY_MULT_PER_PLANET,
    );
  });

  test("stacks multiplicatively for multiple matching planets", () => {
    expect(observatoryMultFor(new Set<VoucherId>(["observatory"]), 2)).toBe(
      OBSERVATORY_MULT_PER_PLANET ** 2,
    );
  });
});

describe("Magic Trick / Illusion voucher catalog (#282)", () => {
  test("Magic Trick is in the catalog with no prerequisite", () => {
    const magicTrick = createVoucherCatalog().find(
      (v) => v.id === "magic-trick",
    );
    expect(magicTrick?.requires).toBeUndefined();
  });

  test("Illusion is in the catalog and requires Magic Trick", () => {
    const illusion = createVoucherCatalog().find((v) => v.id === "illusion");
    expect(illusion?.requires).toBe("magic-trick");
  });

  test("Magic Trick description mentions playing cards in the shop", () => {
    const magicTrick = createVoucherCatalog().find(
      (v) => v.id === "magic-trick",
    );
    expect(magicTrick?.description.toLowerCase()).toMatch(/playing cards/);
  });

  test("Illusion description mentions enhancement, edition, and/or seal", () => {
    const illusion = createVoucherCatalog().find((v) => v.id === "illusion");
    expect(illusion?.description.toLowerCase()).toMatch(
      /enhancement.*edition.*seal/,
    );
  });
});

describe("magicTrickEnabled (#282)", () => {
  test("returns false when Magic Trick is not owned", () => {
    expect(magicTrickEnabled(new Set<VoucherId>())).toBe(false);
  });

  test("returns true when Magic Trick is owned", () => {
    expect(magicTrickEnabled(new Set<VoucherId>(["magic-trick"]))).toBe(true);
  });
});

describe("illusionEnabled (#282)", () => {
  test("returns false when Illusion is not owned", () => {
    expect(illusionEnabled(new Set<VoucherId>())).toBe(false);
  });

  test("returns true when Illusion is owned", () => {
    expect(illusionEnabled(new Set<VoucherId>(["illusion"]))).toBe(true);
  });
});

describe("offerKindWeights — playing-card weight (#282)", () => {
  test("playing-card weight is 0 when Magic Trick is not owned", () => {
    expect(offerKindWeights(new Set<VoucherId>())["playing-card"]).toBe(0);
  });

  test("playing-card weight is positive when Magic Trick is owned", () => {
    expect(
      offerKindWeights(new Set<VoucherId>(["magic-trick"]))["playing-card"],
    ).toBeGreaterThan(0);
  });
});

describe("voucher catalog count (#282)", () => {
  test("catalog contains exactly the expected number of vouchers", () => {
    expect(createVoucherCatalog()).toHaveLength(30);
  });
});
