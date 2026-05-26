// @vitest-environment node
import {
  createBusinessCardJoker,
  createJokerCatalog,
  createPlusFourMultJoker,
  type Joker,
  type RandomSource,
} from "./jokers";
import { createPlanetCatalog } from "./planets";
import { createTarotCatalog } from "./tarots";
import {
  BASE_REROLL_COST,
  SHOP_OFFER_SLOTS,
  pickRandomJoker,
  pickRandomPlanet,
  pickRandomTarot,
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

function baseArgs(rng: RandomSource): Parameters<typeof pickShopOffers>[0] {
  return {
    jokerCatalog: createJokerCatalog(),
    excludedJokerIds: [],
    planetCatalog: createPlanetCatalog(),
    tarotCatalog: createTarotCatalog(),
    rng,
  };
}

describe("SHOP_OFFER_SLOTS", () => {
  test("is three (1 joker + 1 planet + 1 tarot)", () => {
    expect(SHOP_OFFER_SLOTS).toBe(3);
  });
});

describe("BASE_REROLL_COST", () => {
  test("is five dollars", () => {
    expect(BASE_REROLL_COST).toBe(5);
  });
});

describe("rerollCostFor", () => {
  test("returns 5 with zero prior rerolls", () => {
    expect(rerollCostFor(0)).toBe(5);
  });

  test("returns 6 after the first reroll", () => {
    expect(rerollCostFor(1)).toBe(6);
  });

  test("treats a negative reroll count as zero", () => {
    expect(rerollCostFor(-3)).toBe(5);
  });
});

describe("pickRandomJoker", () => {
  test("returns a joker from the catalog when the pool is non-empty", () => {
    expect(pickRandomJoker(createJokerCatalog(), [], mulberry32(1))).not.toBeNull();
  });

  test("never returns an excluded joker", () => {
    const catalog = createJokerCatalog();
    const excluded = ["plus-four-mult"];
    for (let seed = 1; seed <= 30; seed += 1) {
      const result = pickRandomJoker(catalog, excluded, mulberry32(seed));
      expect(result && excluded.includes(result.id)).toBe(false);
    }
  });

  test("returns null when every catalog joker is excluded", () => {
    const catalog = createJokerCatalog();
    expect(pickRandomJoker(catalog, catalog.map((j) => j.id), mulberry32(1))).toBeNull();
  });

  test("sequenceRng helper deterministically picks the first joker", () => {
    const result = pickRandomJoker(createJokerCatalog(), [], sequenceRng([0]));
    expect(result?.id).toBe(createJokerCatalog()[0].id);
  });
});

describe("pickRandomPlanet", () => {
  test("returns a planet when the pool is non-empty", () => {
    expect(pickRandomPlanet(createPlanetCatalog(), [], mulberry32(1))).not.toBeNull();
  });

  test("returns null when the catalog is empty", () => {
    expect(pickRandomPlanet([], [], mulberry32(1))).toBeNull();
  });
});

describe("pickRandomTarot", () => {
  test("returns a tarot when the pool is non-empty", () => {
    expect(pickRandomTarot(createTarotCatalog(), [], mulberry32(1))).not.toBeNull();
  });

  test("returns null when the catalog is empty", () => {
    expect(pickRandomTarot([], [], mulberry32(1))).toBeNull();
  });
});

describe("pickShopOffers — happy path (all three pools non-empty)", () => {
  test("returns three offers", () => {
    expect(pickShopOffers(baseArgs(mulberry32(1)))).toHaveLength(3);
  });

  test("slot 0 is a joker", () => {
    expect(pickShopOffers(baseArgs(mulberry32(1)))[0].kind).toBe("joker");
  });

  test("slot 1 is a planet", () => {
    expect(pickShopOffers(baseArgs(mulberry32(1)))[1].kind).toBe("planet");
  });

  test("slot 2 is a tarot", () => {
    expect(pickShopOffers(baseArgs(mulberry32(1)))[2].kind).toBe("tarot");
  });

  test("the tarot price is the TAROT_BASE_PRICE", () => {
    const offers = pickShopOffers(baseArgs(mulberry32(1)));
    expect(offers[2].price).toBe(3);
  });

  test("freshly-picked offers are not sold", () => {
    const offers = pickShopOffers(baseArgs(mulberry32(1)));
    expect(offers.every((o) => o.sold === false)).toBe(true);
  });
});

describe("pickShopOffers — empty-pool skipping", () => {
  test("returns 2 offers (planet + tarot) when the joker pool is empty", () => {
    const catalog = createJokerCatalog();
    const offers = pickShopOffers({
      ...baseArgs(mulberry32(1)),
      jokerCatalog: catalog,
      excludedJokerIds: catalog.map((j) => j.id),
    });
    expect(offers.map((o) => o.kind)).toEqual(["planet", "tarot"]);
  });

  test("returns 2 offers (joker + tarot) when the planet pool is empty", () => {
    const offers = pickShopOffers({ ...baseArgs(mulberry32(1)), planetCatalog: [] });
    expect(offers.map((o) => o.kind)).toEqual(["joker", "tarot"]);
  });

  test("returns 2 offers (joker + planet) when the tarot pool is empty", () => {
    const offers = pickShopOffers({ ...baseArgs(mulberry32(1)), tarotCatalog: [] });
    expect(offers.map((o) => o.kind)).toEqual(["joker", "planet"]);
  });

  test("returns an empty list when all three pools are empty", () => {
    const offers = pickShopOffers({
      jokerCatalog: [],
      excludedJokerIds: [],
      planetCatalog: [],
      tarotCatalog: [],
      rng: mulberry32(1),
    });
    expect(offers).toEqual([]);
  });
});

describe("rerollShopOffer — kind-preserving rerolls", () => {
  test("rerolling a joker offer yields a joker", () => {
    const original: ShopItem = {
      kind: "joker",
      joker: createPlusFourMultJoker(),
      price: 5,
      sold: false,
    };
    const next = rerollShopOffer(original, baseArgs(mulberry32(1)));
    expect(next?.kind).toBe("joker");
  });

  test("rerolling a planet offer yields a planet", () => {
    const original: ShopItem = {
      kind: "planet",
      planet: createPlanetCatalog()[0],
      price: 3,
      sold: false,
    };
    const next = rerollShopOffer(original, baseArgs(mulberry32(1)));
    expect(next?.kind).toBe("planet");
  });

  test("rerolling a tarot offer yields a tarot", () => {
    const original: ShopItem = {
      kind: "tarot",
      tarot: createTarotCatalog()[0],
      price: 3,
      sold: false,
    };
    const next = rerollShopOffer(original, baseArgs(mulberry32(1)));
    expect(next?.kind).toBe("tarot");
  });

  test("returns null when the same-kind pool is exhausted", () => {
    const original: ShopItem = {
      kind: "joker",
      joker: createBusinessCardJoker(),
      price: 5,
      sold: false,
    };
    const catalog = createJokerCatalog();
    const next = rerollShopOffer(original, {
      ...baseArgs(mulberry32(1)),
      jokerCatalog: catalog,
      excludedJokerIds: catalog.map((j) => j.id),
    });
    expect(next).toBeNull();
  });
});

describe("pickShopOffers — extraSlots (Overstock vouchers)", () => {
  test("ignores extraSlots when omitted (defaults to base 3 offers)", () => {
    expect(pickShopOffers(baseArgs(mulberry32(1)))).toHaveLength(3);
  });

  test("appends one extra offer when extraSlots is 1", () => {
    const offers = pickShopOffers({ ...baseArgs(mulberry32(1)), extraSlots: 1 });
    expect(offers).toHaveLength(4);
  });

  test("appends two extra offers when extraSlots is 2", () => {
    const offers = pickShopOffers({ ...baseArgs(mulberry32(1)), extraSlots: 2 });
    expect(offers).toHaveLength(5);
  });

  test("each extra offer's kind is one of joker/planet/tarot", () => {
    const offers = pickShopOffers({ ...baseArgs(mulberry32(1)), extraSlots: 2 });
    const extras = offers.slice(3);
    expect(extras.every((o) => ["joker", "planet", "tarot"].includes(o.kind))).toBe(true);
  });

  test("treats negative extraSlots as zero", () => {
    const offers = pickShopOffers({ ...baseArgs(mulberry32(1)), extraSlots: -3 });
    expect(offers).toHaveLength(3);
  });
});

describe("joker catalog smoke", () => {
  test("catalog ids remain unique", () => {
    const ids = createJokerCatalog().map((j: Joker) => j.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
