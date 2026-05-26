// @vitest-environment node
import {
  createBusinessCardJoker,
  createJokerCatalog,
  createPlusFourMultJoker,
  type Joker,
  type RandomSource,
} from "./jokers";
import { availablePlanets, createPlanetCatalog } from "./planets";
import type { HandLabel } from "../scoring/handEvaluator";
import { HANDS } from "../constants";
import { createSpectralCatalog } from "./spectrals";
import { createTarotCatalog } from "./tarots";
import {
  BASE_REROLL_COST,
  SHOP_OFFER_SLOTS,
  SHOP_PACK_SLOTS,
  SPECTRAL_OFFER_CHANCE,
  pickRandomJoker,
  pickRandomPlanet,
  pickRandomTarot,
  pickShopOffers,
  pickSingleShopOffer,
  rerollCostFor,
  rerollShopOffer,
  type ShopItem,
} from "./shop";

function itemOffers(offers: ReadonlyArray<ShopItem>): ReadonlyArray<ShopItem> {
  return offers.filter((o) => o.kind !== "pack");
}

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
    spectralCatalog: createSpectralCatalog(),
    rng,
  };
}

describe("SHOP_OFFER_SLOTS", () => {
  test("is two (random-kind slots, Overstock vouchers add more)", () => {
    expect(SHOP_OFFER_SLOTS).toBe(2);
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

describe("pickShopOffers — random-kind happy path", () => {
  test("returns SHOP_OFFER_SLOTS item offers when all three pools are non-empty", () => {
    expect(itemOffers(pickShopOffers(baseArgs(mulberry32(1))))).toHaveLength(
      SHOP_OFFER_SLOTS,
    );
  });

  test("every item offer's kind is one of joker/planet/tarot", () => {
    const offers = itemOffers(pickShopOffers(baseArgs(mulberry32(1))));
    expect(offers.every((o) => ["joker", "planet", "tarot"].includes(o.kind))).toBe(true);
  });

  test("freshly-picked offers are not sold", () => {
    const offers = pickShopOffers(baseArgs(mulberry32(1)));
    expect(offers.every((o) => o.sold === false)).toBe(true);
  });

  test("kind varies across slots across many seeds (not all the same kind)", () => {
    const kindSets = new Set<string>();
    for (let seed = 1; seed <= 30; seed += 1) {
      const offers = pickShopOffers(baseArgs(mulberry32(seed)));
      for (const o of offers) kindSets.add(o.kind);
    }
    expect(kindSets.size).toBeGreaterThanOrEqual(3);
  });
});

describe("pickShopOffers — empty-pool fallback", () => {
  test("still fills item slots with planet or tarot when the joker pool is empty", () => {
    const catalog = createJokerCatalog();
    const offers = itemOffers(
      pickShopOffers({
        ...baseArgs(mulberry32(1)),
        jokerCatalog: catalog,
        excludedJokerIds: catalog.map((j) => j.id),
      }),
    );
    expect(offers.every((o) => o.kind === "planet" || o.kind === "tarot")).toBe(true);
  });

  test("returns SHOP_OFFER_SLOTS item offers even when only one pool has items", () => {
    const offers = itemOffers(
      pickShopOffers({
        ...baseArgs(mulberry32(1)),
        planetCatalog: [],
        tarotCatalog: [],
      }),
    );
    expect(offers).toHaveLength(SHOP_OFFER_SLOTS);
  });

  test("emits no item offers when every item pool is empty", () => {
    const catalog = createJokerCatalog();
    const offers = itemOffers(
      pickShopOffers({
        jokerCatalog: catalog,
        excludedJokerIds: catalog.map((j) => j.id),
        planetCatalog: [],
        tarotCatalog: [],
        spectralCatalog: [],
        rng: mulberry32(1),
      }),
    );
    expect(offers).toEqual([]);
  });
});

describe("rerollShopOffer — random-kind rerolls", () => {
  test("returns an offer of some kind when all pools are non-empty", () => {
    const original: ShopItem = {
      kind: "joker",
      joker: createPlusFourMultJoker(),
      price: 5,
      sold: false,
    };
    const next = rerollShopOffer(original, baseArgs(mulberry32(1)));
    expect(next).not.toBeNull();
  });

  test("reroll can change a joker offer's kind across many seeds", () => {
    const original: ShopItem = {
      kind: "joker",
      joker: createPlusFourMultJoker(),
      price: 5,
      sold: false,
    };
    const kinds = new Set<string>();
    for (let seed = 1; seed <= 30; seed += 1) {
      const next = rerollShopOffer(original, baseArgs(mulberry32(seed)));
      if (next) kinds.add(next.kind);
    }
    expect(kinds.size).toBeGreaterThan(1);
  });

  test("returns null when every pool is empty", () => {
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
      planetCatalog: [],
      tarotCatalog: [],
      spectralCatalog: [],
    });
    expect(next).toBeNull();
  });
});

describe("pickShopOffers — extraSlots (Overstock vouchers)", () => {
  test("returns base SHOP_OFFER_SLOTS item offers when extraSlots is omitted", () => {
    expect(itemOffers(pickShopOffers(baseArgs(mulberry32(1))))).toHaveLength(
      SHOP_OFFER_SLOTS,
    );
  });

  test("returns 3 item offers when extraSlots is 1 (Overstock)", () => {
    const offers = itemOffers(
      pickShopOffers({ ...baseArgs(mulberry32(1)), extraSlots: 1 }),
    );
    expect(offers).toHaveLength(3);
  });

  test("returns 4 item offers when extraSlots is 2 (Overstock + Plus)", () => {
    const offers = itemOffers(
      pickShopOffers({ ...baseArgs(mulberry32(1)), extraSlots: 2 }),
    );
    expect(offers).toHaveLength(4);
  });

  test("treats negative extraSlots as zero", () => {
    const offers = itemOffers(
      pickShopOffers({ ...baseArgs(mulberry32(1)), extraSlots: -3 }),
    );
    expect(offers).toHaveLength(SHOP_OFFER_SLOTS);
  });
});

describe("joker catalog smoke", () => {
  test("catalog ids remain unique", () => {
    const ids = createJokerCatalog().map((j: Joker) => j.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

function offerSubjectId(offer: ShopItem): string {
  switch (offer.kind) {
    case "joker":
      return offer.joker.id;
    case "planet":
      return offer.planet.id;
    case "tarot":
      return offer.tarot.id;
    case "spectral":
      return offer.spectral.id;
    case "pack":
      return `pack-${offer.pack.pool}-${offer.pack.variant}`;
  }
}

describe("pickShopOffers — no duplicate offers within a single visit", () => {
  test("two item slots never share the same item across 200 seeds", () => {
    let duplicateSeed: number | null = null;
    for (let seed = 1; seed <= 200; seed += 1) {
      const offers = itemOffers(pickShopOffers(baseArgs(mulberry32(seed))));
      const ids = offers.map(offerSubjectId);
      if (new Set(ids).size !== ids.length) {
        duplicateSeed = seed;
        break;
      }
    }
    expect(duplicateSeed).toBeNull();
  });

  test("four item slots (Overstock + Plus) still produce four distinct items", () => {
    const offers = itemOffers(
      pickShopOffers({
        ...baseArgs(mulberry32(1)),
        extraSlots: 2,
      }),
    );
    const ids = offers.map(offerSubjectId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("when only one planet exists, two planet picks degrade to one item offer instead of duplicating", () => {
    const singlePlanetCatalog = createPlanetCatalog().slice(0, 1);
    const offers = itemOffers(
      pickShopOffers({
        jokerCatalog: [],
        excludedJokerIds: [],
        planetCatalog: singlePlanetCatalog,
        tarotCatalog: [],
        spectralCatalog: [],
        rng: sequenceRng([0.4, 0.4]),
      }),
    );
    expect(offers).toHaveLength(1);
  });
});

describe("rerollShopOffer — never returns the same item", () => {
  test("rerolling a joker never returns that same joker across many seeds", () => {
    const original: ShopItem = {
      kind: "joker",
      joker: createPlusFourMultJoker(),
      price: 5,
      sold: false,
    };
    let collidedAtSeed: number | null = null;
    for (let seed = 1; seed <= 50; seed += 1) {
      const next = rerollShopOffer(original, baseArgs(mulberry32(seed)));
      if (next && next.kind === "joker" && next.joker.id === original.joker.id) {
        collidedAtSeed = seed;
        break;
      }
    }
    expect(collidedAtSeed).toBeNull();
  });
});

function emptyHandCounts(): Readonly<Record<HandLabel, number>> {
  const counts = {} as Record<HandLabel, number>;
  for (const hand of HANDS) {
    counts[hand.label as HandLabel] = 0;
  }
  return counts;
}

const SECRET_PLANET_IDS: ReadonlyArray<string> = ["planet-x", "ceres", "eris"];

describe("pickShopOffers — secret planet gating via availablePlanets", () => {
  test("never offers Planet X / Ceres / Eris with empty handPlayCounts across many seeds", () => {
    const counts = emptyHandCounts();
    const filtered = availablePlanets(createPlanetCatalog(), counts);
    for (let seed = 1; seed <= 50; seed += 1) {
      const offers = pickShopOffers({
        ...baseArgs(mulberry32(seed)),
        planetCatalog: filtered,
        extraSlots: 4,
      });
      for (const offer of offers) {
        if (offer.kind === "planet") {
          expect(SECRET_PLANET_IDS).not.toContain(offer.planet.id);
        }
      }
    }
  });

  test("Planet X becomes reachable after Five of a Kind is unlocked", () => {
    const filtered = availablePlanets(
      createPlanetCatalog(),
      { ...emptyHandCounts(), "Five of a Kind": 1 },
    );
    let saw = false;
    for (let seed = 1; seed <= 200 && !saw; seed += 1) {
      const offers = pickShopOffers({
        ...baseArgs(mulberry32(seed)),
        planetCatalog: filtered,
        extraSlots: 4,
      });
      if (offers.some((o) => o.kind === "planet" && o.planet.id === "planet-x")) {
        saw = true;
      }
    }
    expect(saw).toBe(true);
  });
});

describe("pickShopOffers — spectral offer rate", () => {
  test("SPECTRAL_OFFER_CHANCE is rarer than common kinds (≤25%)", () => {
    expect(SPECTRAL_OFFER_CHANCE).toBeLessThanOrEqual(0.25);
  });

  test("spectral offers appear at least once across many seeds", () => {
    let saw = false;
    for (let seed = 1; seed <= 200 && !saw; seed += 1) {
      const offers = pickShopOffers(baseArgs(mulberry32(seed)));
      if (offers.some((o) => o.kind === "spectral")) saw = true;
    }
    expect(saw).toBe(true);
  });

  test("spectral offers are rarer than the combined common kinds across many seeds", () => {
    let spectralCount = 0;
    let commonCount = 0;
    for (let seed = 1; seed <= 500; seed += 1) {
      const offers = itemOffers(pickShopOffers(baseArgs(mulberry32(seed))));
      for (const offer of offers) {
        if (offer.kind === "spectral") spectralCount += 1;
        else commonCount += 1;
      }
    }
    expect(spectralCount).toBeLessThan(commonCount);
  });

  test("never offers a spectral when the spectral catalog is empty", () => {
    let spectralSeen = false;
    for (let seed = 1; seed <= 50 && !spectralSeen; seed += 1) {
      const offers = pickShopOffers({
        ...baseArgs(mulberry32(seed)),
        spectralCatalog: [],
      });
      if (offers.some((o) => o.kind === "spectral")) spectralSeen = true;
    }
    expect(spectralSeen).toBe(false);
  });
});

describe("rerollShopOffer — secret planet gating via availablePlanets", () => {
  test("never rerolls into Planet X / Ceres / Eris with empty handPlayCounts", () => {
    const filtered = availablePlanets(createPlanetCatalog(), emptyHandCounts());
    const original: ShopItem = {
      kind: "joker",
      joker: createPlusFourMultJoker(),
      price: 5,
      sold: false,
    };
    for (let seed = 1; seed <= 50; seed += 1) {
      const next = rerollShopOffer(original, {
        ...baseArgs(mulberry32(seed)),
        planetCatalog: filtered,
      });
      if (next && next.kind === "planet") {
        expect(SECRET_PLANET_IDS).not.toContain(next.planet.id);
      }
    }
  });
});

describe("pickShopOffers — pack slots", () => {
  function packOffers(offers: ReadonlyArray<ShopItem>): ReadonlyArray<ShopItem> {
    return offers.filter((o) => o.kind === "pack");
  }

  test("emits SHOP_PACK_SLOTS pack offers per shop visit", () => {
    expect(SHOP_PACK_SLOTS).toBe(2);
    expect(packOffers(pickShopOffers(baseArgs(mulberry32(1))))).toHaveLength(
      SHOP_PACK_SLOTS,
    );
  });

  test("pack slots are emitted after the item slots", () => {
    const offers = pickShopOffers(baseArgs(mulberry32(1)));
    const firstPackIdx = offers.findIndex((o) => o.kind === "pack");
    expect(firstPackIdx).toBeGreaterThanOrEqual(SHOP_OFFER_SLOTS);
  });

  test("pack slots still appear when item pools are empty", () => {
    const offers = pickShopOffers({
      jokerCatalog: [],
      excludedJokerIds: [],
      planetCatalog: createPlanetCatalog(),
      tarotCatalog: [],
      spectralCatalog: [],
      rng: mulberry32(1),
    });
    expect(packOffers(offers)).toHaveLength(SHOP_PACK_SLOTS);
  });

  test("rerollShopOffer returns null for a pack offer (packs are not rerollable)", () => {
    const offers = pickShopOffers(baseArgs(mulberry32(1)));
    const pack = offers.find((o) => o.kind === "pack");
    if (!pack) throw new Error("expected a pack in shop offers");
    expect(rerollShopOffer(pack, baseArgs(mulberry32(2)))).toBeNull();
  });

  test("a Celestial pack offer carries options drawn from the planet catalog", () => {
    const offers = pickShopOffers(baseArgs(mulberry32(1)));
    const pack = offers.find((o) => o.kind === "pack");
    if (!pack || pack.kind !== "pack") throw new Error("expected a pack");
    expect(pack.pack.options.length).toBeGreaterThan(0);
  });
});

describe("pickSingleShopOffer", () => {
  test("returns a non-pack offer", () => {
    const offer = pickSingleShopOffer(baseArgs(mulberry32(1)), []);
    expect(offer && offer.kind !== "pack").toBe(true);
  });

  test("returns null when all joker/planet/tarot/spectral catalogs are exhausted (negative)", () => {
    const offer = pickSingleShopOffer(
      {
        ...baseArgs(mulberry32(1)),
        jokerCatalog: [],
        planetCatalog: [],
        tarotCatalog: [],
        spectralCatalog: [],
      },
      [],
    );
    expect(offer).toBeNull();
  });

  test("does not return a joker already present in existing offers", () => {
    const existing = pickShopOffers(baseArgs(mulberry32(1)));
    const existingJokerIds = existing
      .filter((o) => o.kind === "joker")
      .map((o) => (o.kind === "joker" ? o.joker.id : ""));
    for (let seed = 1; seed < 50; seed += 1) {
      const next = pickSingleShopOffer(baseArgs(mulberry32(seed)), existing);
      if (next && next.kind === "joker") {
        expect(existingJokerIds).not.toContain(next.joker.id);
      }
    }
  });

  test("excludes jokers passed via excludedJokerIds", () => {
    const args = baseArgs(mulberry32(7));
    const allButOne = createJokerCatalog().slice(1).map((j) => j.id);
    const first = createJokerCatalog()[0].id;
    for (let seed = 1; seed < 30; seed += 1) {
      const next = pickSingleShopOffer(
        { ...baseArgs(mulberry32(seed)), excludedJokerIds: allButOne },
        [],
      );
      if (next && next.kind === "joker") {
        expect(next.joker.id).toBe(first);
      }
    }
    expect(args).toBeTruthy();
  });
});
