import {
  createBusinessCardJoker,
  createGluttonousJoker,
  createGreedyJoker,
  createJokerCatalog,
  createJokerStencilJoker,
  createLustyJoker,
  createPlusFourMultJoker,
  createWrathfulJoker,
  type Joker,
  type RandomSource,
} from "./jokers";
import {
  BASE_REROLL_COST,
  SHOP_OFFER_SLOTS,
  pickShopJokers,
  rerollCostFor,
} from "./shop";

function sequenceRng(values: ReadonlyArray<number>): RandomSource {
  let i = 0;
  return (): number => {
    const v = values[i % values.length];
    i += 1;
    return v;
  };
}

function mulberry32(seed: number): RandomSource {
  let a = seed >>> 0;
  return (): number => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("SHOP_OFFER_SLOTS", () => {
  test("defaults to two offer slots per shop visit", () => {
    expect(SHOP_OFFER_SLOTS).toBe(2);
  });
});

describe("BASE_REROLL_COST", () => {
  test("is five dollars", () => {
    expect(BASE_REROLL_COST).toBe(5);
  });
});

describe("rerollCostFor", () => {
  test("returns 5 when no rerolls have happened yet", () => {
    expect(rerollCostFor(0)).toBe(5);
  });

  test("returns 6 after the first reroll", () => {
    expect(rerollCostFor(1)).toBe(6);
  });

  test("returns 7 after the second reroll", () => {
    expect(rerollCostFor(2)).toBe(7);
  });

  test("scales linearly with reroll count", () => {
    expect(rerollCostFor(10)).toBe(15);
  });

  test("treats a negative reroll count as zero", () => {
    expect(rerollCostFor(-3)).toBe(5);
  });
});

describe("createJokerCatalog", () => {
  test("includes every implemented joker by id", () => {
    const ids = createJokerCatalog().map((j) => j.id);
    expect(ids).toEqual([
      "plus-four-mult",
      "business-card",
      "joker-stencil",
      "greedy-joker",
      "lusty-joker",
      "wrathful-joker",
      "gluttonous-joker",
    ]);
  });

  test("contains no duplicate ids", () => {
    const ids = createJokerCatalog().map((j) => j.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("pickShopJokers — basic draw", () => {
  test("returns exactly slotCount jokers when the pool is larger than the slot count", () => {
    const result = pickShopJokers(createJokerCatalog(), [], 2, sequenceRng([0]));
    expect(result).toHaveLength(2);
  });

  test("returns only jokers that come from the supplied catalog", () => {
    const catalog = createJokerCatalog();
    const catalogIds = new Set(catalog.map((j) => j.id));
    const result = pickShopJokers(catalog, [], 2, mulberry32(1));
    const allFromCatalog = result.every((j) => catalogIds.has(j.id));
    expect(allFromCatalog).toBe(true);
  });

  test("produces two distinct joker ids across the two offer slots", () => {
    const result = pickShopJokers(createJokerCatalog(), [], 2, mulberry32(7));
    expect(new Set(result.map((j) => j.id)).size).toBe(result.length);
  });

  test("never returns duplicates even when slotCount equals the full pool", () => {
    const catalog = createJokerCatalog();
    const result = pickShopJokers(catalog, [], catalog.length, mulberry32(42));
    expect(new Set(result.map((j) => j.id)).size).toBe(catalog.length);
  });
});

describe("pickShopJokers — excludes owned jokers", () => {
  test("never returns a joker whose id is in ownedIds", () => {
    const catalog = createJokerCatalog();
    const owned = ["plus-four-mult", "business-card"];
    const seen = new Set<string>();
    for (let seed = 1; seed <= 50; seed += 1) {
      const result = pickShopJokers(catalog, owned, 2, mulberry32(seed));
      for (const j of result) {
        seen.add(j.id);
      }
    }
    const leaked = owned.some((id) => seen.has(id));
    expect(leaked).toBe(false);
  });

  test("treats an unknown owned id as a no-op (still draws slotCount jokers)", () => {
    const result = pickShopJokers(
      createJokerCatalog(),
      ["not-a-real-joker"],
      2,
      mulberry32(3),
    );
    expect(result).toHaveLength(2);
  });
});

describe("pickShopJokers — coverage across the pool", () => {
  test("every catalog joker appears at least once across many seeded draws", () => {
    const catalog = createJokerCatalog();
    const seen = new Set<string>();
    for (let seed = 1; seed <= 200; seed += 1) {
      const result = pickShopJokers(catalog, [], 2, mulberry32(seed));
      for (const j of result) {
        seen.add(j.id);
      }
    }
    expect(seen.size).toBe(catalog.length);
  });

  test("every non-owned catalog joker appears at least once across many seeded draws", () => {
    const catalog = createJokerCatalog();
    const owned = ["plus-four-mult"];
    const expected = catalog
      .map((j) => j.id)
      .filter((id) => !owned.includes(id));
    const seen = new Set<string>();
    for (let seed = 1; seed <= 200; seed += 1) {
      const result = pickShopJokers(catalog, owned, 2, mulberry32(seed));
      for (const j of result) {
        seen.add(j.id);
      }
    }
    const allExpectedSeen = expected.every((id) => seen.has(id));
    expect(allExpectedSeen).toBe(true);
  });
});

describe("pickShopJokers — pool smaller than slot count", () => {
  test("returns only the available jokers when the pool has fewer than slotCount entries", () => {
    const catalog = [createPlusFourMultJoker(), createBusinessCardJoker()];
    const result = pickShopJokers(catalog, ["plus-four-mult"], 2, mulberry32(1));
    expect(result).toHaveLength(1);
  });

  test("does not fall back to offering an owned joker when the pool is too small", () => {
    const catalog = [createPlusFourMultJoker(), createBusinessCardJoker()];
    const owned = ["plus-four-mult"];
    const result = pickShopJokers(catalog, owned, 2, mulberry32(1));
    const containsOwned = result.some((j) => owned.includes(j.id));
    expect(containsOwned).toBe(false);
  });
});

describe("pickShopJokers — empty pool", () => {
  test("returns an empty array when every catalog joker is owned", () => {
    const catalog = createJokerCatalog();
    const ownedIds = catalog.map((j) => j.id);
    const result = pickShopJokers(catalog, ownedIds, 2, mulberry32(1));
    expect(result).toEqual([]);
  });

  test("returns an empty array when the catalog itself is empty", () => {
    const result = pickShopJokers([], [], 2, mulberry32(1));
    expect(result).toEqual([]);
  });
});

describe("pickShopJokers — degenerate slot counts", () => {
  test("returns an empty array when slotCount is zero", () => {
    const result = pickShopJokers(createJokerCatalog(), [], 0, mulberry32(1));
    expect(result).toEqual([]);
  });

  test("returns an empty array when slotCount is negative", () => {
    const result = pickShopJokers(createJokerCatalog(), [], -3, mulberry32(1));
    expect(result).toEqual([]);
  });
});

describe("pickShopJokers — determinism and isolation", () => {
  test("returns the same selection for the same seed", () => {
    const catalog = createJokerCatalog();
    const a = pickShopJokers(catalog, [], 3, mulberry32(99)).map((j) => j.id);
    const b = pickShopJokers(catalog, [], 3, mulberry32(99)).map((j) => j.id);
    expect(a).toEqual(b);
  });

  test("does not mutate the input catalog", () => {
    const catalog = createJokerCatalog();
    const before = catalog.map((j) => j.id);
    pickShopJokers(catalog, [], 2, mulberry32(1));
    const after = catalog.map((j) => j.id);
    expect(after).toEqual(before);
  });

  test("does not mutate the input ownedIds array", () => {
    const owned: string[] = ["plus-four-mult", "business-card"];
    const snapshot = [...owned];
    pickShopJokers(createJokerCatalog(), owned, 2, mulberry32(1));
    expect(owned).toEqual(snapshot);
  });

  test("two consecutive draws with the same fresh seed and the same ownedIds do not produce an owned joker", () => {
    const catalog = createJokerCatalog();
    const owned = ["greedy-joker", "lusty-joker"];
    const first = pickShopJokers(catalog, owned, 2, mulberry32(11));
    const second = pickShopJokers(catalog, owned, 2, mulberry32(11));
    const combined = [...first, ...second];
    const leaked = combined.some((j) => owned.includes(j.id));
    expect(leaked).toBe(false);
  });
});

describe("pickShopJokers — joker identity preserved", () => {
  test("returns the exact joker objects from the catalog (same reference)", () => {
    const plus = createPlusFourMultJoker();
    const business = createBusinessCardJoker();
    const stencil = createJokerStencilJoker();
    const catalog: ReadonlyArray<Joker> = [plus, business, stencil];
    const result = pickShopJokers(catalog, [], 3, mulberry32(2));
    const everyResultIsACatalogReference = result.every((j) =>
      catalog.includes(j),
    );
    expect(everyResultIsACatalogReference).toBe(true);
  });

  test("returns suit-mult jokers untouched (effect carries through to the offer)", () => {
    const catalog: ReadonlyArray<Joker> = [
      createGreedyJoker(),
      createLustyJoker(),
      createWrathfulJoker(),
      createGluttonousJoker(),
    ];
    const result = pickShopJokers(catalog, [], 1, sequenceRng([0]));
    expect(result[0].effect.kind).toBe("per-suit-mult");
  });
});
