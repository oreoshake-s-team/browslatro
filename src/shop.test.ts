import {
  createBusinessCardJoker,
  createJokerCatalog,
  createPlusFourMultJoker,
  type Joker,
  type RandomSource,
} from "./jokers";
import { createPlanetCatalog } from "./planets";
import {
  BASE_REROLL_COST,
  SHOP_OFFER_SLOTS,
  pickRandomJoker,
  pickRandomPlanet,
  pickShopOffers,
  rerollCostFor,
  rerollShopOffer,
  type ShopItem,
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

  test("scales linearly with reroll count", () => {
    expect(rerollCostFor(10)).toBe(15);
  });

  test("treats a negative reroll count as zero", () => {
    expect(rerollCostFor(-3)).toBe(5);
  });
});

describe("pickRandomJoker", () => {
  test("returns a joker from the catalog when the pool is non-empty", () => {
    const result = pickRandomJoker(createJokerCatalog(), [], mulberry32(1));
    expect(result).not.toBeNull();
  });

  test("never returns an excluded joker", () => {
    const catalog = createJokerCatalog();
    const excluded = ["plus-four-mult", "business-card"];
    for (let seed = 1; seed <= 30; seed += 1) {
      const result = pickRandomJoker(catalog, excluded, mulberry32(seed));
      expect(result && excluded.includes(result.id)).toBe(false);
    }
  });

  test("returns null when every catalog joker is excluded", () => {
    const catalog = createJokerCatalog();
    const result = pickRandomJoker(
      catalog,
      catalog.map((j) => j.id),
      mulberry32(1),
    );
    expect(result).toBeNull();
  });

  test("returns null when the catalog is empty", () => {
    expect(pickRandomJoker([], [], mulberry32(1))).toBeNull();
  });
});

describe("pickRandomPlanet", () => {
  test("returns a planet from the catalog when the pool is non-empty", () => {
    const result = pickRandomPlanet(createPlanetCatalog(), [], mulberry32(1));
    expect(result).not.toBeNull();
  });

  test("never returns an excluded planet", () => {
    const catalog = createPlanetCatalog();
    const excluded = ["pluto", "mercury"];
    for (let seed = 1; seed <= 30; seed += 1) {
      const result = pickRandomPlanet(catalog, excluded, mulberry32(seed));
      expect(result && excluded.includes(result.id)).toBe(false);
    }
  });

  test("returns null when every catalog planet is excluded", () => {
    const catalog = createPlanetCatalog();
    const result = pickRandomPlanet(
      catalog,
      catalog.map((p) => p.id),
      mulberry32(1),
    );
    expect(result).toBeNull();
  });

  test("returns null when the catalog is empty", () => {
    expect(pickRandomPlanet([], [], mulberry32(1))).toBeNull();
  });
});

describe("pickShopOffers — happy path (both pools non-empty)", () => {
  function baseArgs(rng: RandomSource): Parameters<typeof pickShopOffers>[0] {
    return {
      jokerCatalog: createJokerCatalog(),
      excludedJokerIds: [],
      planetCatalog: createPlanetCatalog(),
      rng,
    };
  }

  test("returns exactly 2 offers", () => {
    expect(pickShopOffers(baseArgs(mulberry32(1)))).toHaveLength(2);
  });

  test("slot 0 is a joker", () => {
    expect(pickShopOffers(baseArgs(mulberry32(1)))[0].kind).toBe("joker");
  });

  test("slot 1 is a planet", () => {
    expect(pickShopOffers(baseArgs(mulberry32(1)))[1].kind).toBe("planet");
  });

  test("the joker price is the JOKER_BASE_PRICE", () => {
    const [joker] = pickShopOffers(baseArgs(mulberry32(1)));
    expect(joker.price).toBe(5);
  });

  test("the planet price is the PLANET_BASE_PRICE", () => {
    const [, planet] = pickShopOffers(baseArgs(mulberry32(1)));
    expect(planet.price).toBe(3);
  });

  test("freshly-picked offers are not sold", () => {
    const offers = pickShopOffers(baseArgs(mulberry32(1)));
    expect(offers.every((o) => o.sold === false)).toBe(true);
  });

  test("never returns an excluded joker in the joker slot", () => {
    const seen = new Set<string>();
    const excluded = ["plus-four-mult"];
    for (let seed = 1; seed <= 30; seed += 1) {
      const offers = pickShopOffers({
        ...baseArgs(mulberry32(seed)),
        excludedJokerIds: excluded,
      });
      const joker = offers[0];
      if (joker.kind === "joker") seen.add(joker.joker.id);
    }
    expect(seen.has("plus-four-mult")).toBe(false);
  });

  test("over many seeds, both jokers and planets are sampled across all rolls", () => {
    const kinds = new Set<string>();
    for (let seed = 1; seed <= 30; seed += 1) {
      const offers = pickShopOffers(baseArgs(mulberry32(seed)));
      for (const o of offers) kinds.add(o.kind);
    }
    expect(kinds).toEqual(new Set(["joker", "planet"]));
  });
});

describe("pickShopOffers — fallbacks", () => {
  test("when the joker pool is empty, both slots are planets", () => {
    const catalog = createJokerCatalog();
    const offers = pickShopOffers({
      jokerCatalog: catalog,
      excludedJokerIds: catalog.map((j) => j.id),
      planetCatalog: createPlanetCatalog(),
      rng: mulberry32(1),
    });
    expect(offers.map((o) => o.kind)).toEqual(["planet", "planet"]);
  });

  test("fallback planet pair has two distinct planets", () => {
    const catalog = createJokerCatalog();
    const offers = pickShopOffers({
      jokerCatalog: catalog,
      excludedJokerIds: catalog.map((j) => j.id),
      planetCatalog: createPlanetCatalog(),
      rng: mulberry32(1),
    });
    const ids = offers.flatMap((o) => (o.kind === "planet" ? [o.planet.id] : []));
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("when the planet pool is empty, both slots are jokers", () => {
    const offers = pickShopOffers({
      jokerCatalog: createJokerCatalog(),
      excludedJokerIds: [],
      planetCatalog: [],
      rng: mulberry32(1),
    });
    expect(offers.map((o) => o.kind)).toEqual(["joker", "joker"]);
  });

  test("fallback joker pair has two distinct jokers", () => {
    const offers = pickShopOffers({
      jokerCatalog: createJokerCatalog(),
      excludedJokerIds: [],
      planetCatalog: [],
      rng: mulberry32(1),
    });
    const ids = offers.flatMap((o) => (o.kind === "joker" ? [o.joker.id] : []));
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("when both pools are empty, returns an empty list", () => {
    const offers = pickShopOffers({
      jokerCatalog: [],
      excludedJokerIds: [],
      planetCatalog: [],
      rng: mulberry32(1),
    });
    expect(offers).toEqual([]);
  });
});

describe("pickShopOffers — input safety", () => {
  test("does not mutate the input excludedJokerIds array", () => {
    const excluded: string[] = ["plus-four-mult"];
    const snapshot = [...excluded];
    pickShopOffers({
      jokerCatalog: createJokerCatalog(),
      excludedJokerIds: excluded,
      planetCatalog: createPlanetCatalog(),
      rng: mulberry32(1),
    });
    expect(excluded).toEqual(snapshot);
  });
});

describe("rerollShopOffer", () => {
  function args(rng: RandomSource): Parameters<typeof rerollShopOffer>[1] {
    return {
      jokerCatalog: createJokerCatalog(),
      excludedJokerIds: [],
      planetCatalog: createPlanetCatalog(),
      rng,
    };
  }

  test("rerolling a joker offer yields a joker (when joker pool non-empty)", () => {
    const original: ShopItem = {
      kind: "joker",
      joker: createPlusFourMultJoker(),
      price: 5,
      sold: false,
    };
    const next = rerollShopOffer(original, args(mulberry32(1)));
    expect(next?.kind).toBe("joker");
  });

  test("rerolling a planet offer yields a planet (when planet pool non-empty)", () => {
    const planet = createPlanetCatalog()[0];
    const original: ShopItem = {
      kind: "planet",
      planet,
      price: 3,
      sold: false,
    };
    const next = rerollShopOffer(original, args(mulberry32(1)));
    expect(next?.kind).toBe("planet");
  });

  test("rerolling a joker offer falls back to a planet when joker pool is empty", () => {
    const original: ShopItem = {
      kind: "joker",
      joker: createPlusFourMultJoker(),
      price: 5,
      sold: false,
    };
    const catalog = createJokerCatalog();
    const next = rerollShopOffer(original, {
      jokerCatalog: catalog,
      excludedJokerIds: catalog.map((j) => j.id),
      planetCatalog: createPlanetCatalog(),
      rng: mulberry32(1),
    });
    expect(next?.kind).toBe("planet");
  });

  test("rerolling a planet offer falls back to a joker when planet pool is empty", () => {
    const original: ShopItem = {
      kind: "planet",
      planet: createPlanetCatalog()[0],
      price: 3,
      sold: false,
    };
    const next = rerollShopOffer(original, {
      jokerCatalog: createJokerCatalog(),
      excludedJokerIds: [],
      planetCatalog: [],
      rng: mulberry32(1),
    });
    expect(next?.kind).toBe("joker");
  });

  test("returns null when both pools are exhausted", () => {
    const original: ShopItem = {
      kind: "joker",
      joker: createBusinessCardJoker(),
      price: 5,
      sold: false,
    };
    const catalog = createJokerCatalog();
    const next = rerollShopOffer(original, {
      jokerCatalog: catalog,
      excludedJokerIds: catalog.map((j) => j.id),
      planetCatalog: [],
      rng: mulberry32(1),
    });
    expect(next).toBeNull();
  });
});

describe("joker catalog smoke", () => {
  test("catalog ids remain unique", () => {
    const ids = createJokerCatalog().map((j: Joker) => j.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("sequenceRng helper deterministically picks the first joker", () => {
    const result = pickRandomJoker(createJokerCatalog(), [], sequenceRng([0]));
    expect(result?.id).toBe(createJokerCatalog()[0].id);
  });
});
