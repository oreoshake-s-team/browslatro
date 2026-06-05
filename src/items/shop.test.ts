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
import { HANDS, JOKER_BASE_PRICE } from "../constants";
import { RENTAL_BASE_PRICE } from "./jokers";
import { createSpectralCatalog } from "./spectrals";
import { createTarotCatalog } from "./tarots";
import {
  SHOP_OFFER_SLOTS,
  SHOP_PACK_SLOTS,
  SPECTRAL_OFFER_CHANCE,
  applyEditionToFirstJoker,
  applyAstronomerPricing,
  applyStakeStickersToShopOffers,
  buildFreeJokerOffers,
  ensureBaseJokerForEdition,
  jokerOfferPrice,
  mergeFreeJokerOffersIntoShop,
  pickRandomJoker,
  pickRandomPlanet,
  pickRandomTarot,
  pickShopItemOffers,
  pickShopOffers,
  pickSingleShopOffer,
  rerollCostFor,
  rerollShopOffer,
  type ShopItem,
} from "./shop";
import { chanceOverrideConfig } from "../dev/chanceOverride";

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

describe("rerollCostFor", () => {
  test.each<{ count: number; expected: number; label: string }>([
    { count: 0, expected: 5, label: "zero prior rerolls" },
    { count: 1, expected: 6, label: "first reroll" },
    { count: -3, expected: 5, label: "a negative reroll count" },
  ])("returns $expected after $label", ({ count, expected }) => {
    expect(rerollCostFor(count)).toBe(expected);
  });

  test("applies reduction to base cost when reduction parameter is provided", () => {
    expect(rerollCostFor(0, 2)).toBe(3);
  });

  test("applies cumulative reduction with reroll count", () => {
    expect(rerollCostFor(3, 4)).toBe(4);
  });

  test("never returns negative cost (uses Math.max(0, ...))", () => {
    expect(rerollCostFor(0, 10)).toBe(0);
  });

  test("ignores negative reduction values (clamps with Math.max(0, reduction))", () => {
    expect(rerollCostFor(2, -5)).toBe(7);
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
  test.each<{ extraSlots: number | undefined; expected: number; label: string }>([
    { extraSlots: undefined, expected: SHOP_OFFER_SLOTS, label: "omitted" },
    { extraSlots: 1, expected: 3, label: "1 (Overstock)" },
    { extraSlots: 2, expected: 4, label: "2 (Overstock + Plus)" },
    { extraSlots: -3, expected: SHOP_OFFER_SLOTS, label: "negative (treated as zero)" },
  ])("extraSlots=$label produces $expected item offers", ({ extraSlots, expected }) => {
    const args = extraSlots === undefined
      ? baseArgs(mulberry32(1))
      : { ...baseArgs(mulberry32(1)), extraSlots };
    const offers = itemOffers(pickShopOffers(args));
    expect(offers).toHaveLength(expected);
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

  test("force100 override guarantees at least one spectral in a multi-slot shop (#354)", () => {
    chanceOverrideConfig.force100 = true;
    try {
      const offers = pickShopOffers({
        ...baseArgs(mulberry32(7)),
        extraSlots: 1,
      });
      expect(offers.some((o) => o.kind === "spectral")).toBe(true);
    } finally {
      chanceOverrideConfig.force100 = false;
    }
  });
});

describe("pickSingleShopOffer — Omen Globe tarot→spectral swap (#278)", () => {
  function tarotOnlyArgs(rng: RandomSource): Parameters<typeof pickSingleShopOffer>[0] {
    return {
      jokerCatalog: [],
      excludedJokerIds: [],
      planetCatalog: [],
      tarotCatalog: createTarotCatalog(),
      spectralCatalog: createSpectralCatalog(),
      rng,
    };
  }

  test("a tarot kind is swapped for a spectral when the swap chance fires", () => {
    const rng = sequenceRng([0.99, 0.99, 0.0, 0]);
    const offer = pickSingleShopOffer(
      { ...tarotOnlyArgs(rng), tarotToSpectralSwapChance: 0.2 },
      [],
    );
    expect(offer?.kind).toBe("spectral");
  });

  test("a tarot kind stays a tarot when the swap chance does NOT fire", () => {
    const rng = sequenceRng([0.99, 0.99, 0.99, 0]);
    const offer = pickSingleShopOffer(
      { ...tarotOnlyArgs(rng), tarotToSpectralSwapChance: 0.2 },
      [],
    );
    expect(offer?.kind).toBe("tarot");
  });

  test("without Omen Globe (swap chance 0), a tarot roll always stays a tarot", () => {
    const rng = sequenceRng([0.99, 0.99, 0]);
    const offer = pickSingleShopOffer(tarotOnlyArgs(rng), []);
    expect(offer?.kind).toBe("tarot");
  });

  test("falls back to a tarot when the swap fires but the spectral catalog is empty", () => {
    const rng = sequenceRng([0.99, 0.99, 0.0, 0]);
    const offer = pickSingleShopOffer(
      {
        ...tarotOnlyArgs(rng),
        spectralCatalog: [],
        tarotToSpectralSwapChance: 0.2,
      },
      [],
    );
    expect(offer?.kind).toBe("tarot");
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

describe("pickShopItemOffers — item-only generation for reroll (#374)", () => {
  test("returns SHOP_OFFER_SLOTS item offers", () => {
    expect(pickShopItemOffers(baseArgs(mulberry32(1)))).toHaveLength(
      SHOP_OFFER_SLOTS,
    );
  });

  test("never returns a pack offer (packs are excluded by construction)", () => {
    const offers = pickShopItemOffers(baseArgs(mulberry32(1)));
    expect(offers.some((o) => o.kind === "pack")).toBe(false);
  });

  test("respects extraSlots like pickShopOffers does", () => {
    const offers = pickShopItemOffers({
      ...baseArgs(mulberry32(1)),
      extraSlots: 2,
    });
    expect(offers).toHaveLength(SHOP_OFFER_SLOTS + 2);
  });

  test("does NOT emit any pack slots even when extraPackSlots is set", () => {
    const offers = pickShopItemOffers({
      ...baseArgs(mulberry32(1)),
      extraPackSlots: 3,
    });
    expect(offers.some((o) => o.kind === "pack")).toBe(false);
  });
});

describe("pickShopOffers — forcedPackPools (dev queue)", () => {
  function packs(offers: ReadonlyArray<ShopItem>): ReadonlyArray<ShopItem> {
    return offers.filter((o) => o.kind === "pack");
  }

  test("a single forced Arcana pack appears in the next shop", () => {
    const offers = pickShopOffers({
      ...baseArgs(mulberry32(1)),
      forcedPackPools: ["arcana"],
    });
    expect(
      packs(offers).some((o) => o.kind === "pack" && o.pack.pool === "arcana"),
    ).toBe(true);
  });

  test("two forced Spectral packs both appear in the next shop", () => {
    const offers = pickShopOffers({
      ...baseArgs(mulberry32(2)),
      forcedPackPools: ["spectral", "spectral"],
    });
    expect(
      packs(offers).filter((o) => o.kind === "pack" && o.pack.pool === "spectral").length,
    ).toBe(2);
  });

  test("forced pack count + rolled packs respects the base SHOP_PACK_SLOTS cap", () => {
    const offers = pickShopOffers({
      ...baseArgs(mulberry32(3)),
      forcedPackPools: ["celestial"],
    });
    expect(packs(offers).length).toBe(SHOP_PACK_SLOTS);
  });

  test("queueing more forced packs than the cap overflows to that count", () => {
    const offers = pickShopOffers({
      ...baseArgs(mulberry32(4)),
      forcedPackPools: ["arcana", "arcana", "arcana"],
    });
    expect(packs(offers).length).toBe(3);
  });

  test("forced packs are prepended before rolled packs", () => {
    const offers = pickShopOffers({
      ...baseArgs(mulberry32(5)),
      forcedPackPools: ["spectral"],
    });
    const first = packs(offers)[0];
    expect(first?.kind === "pack" && first.pack.pool).toBe("spectral");
  });

  test("each forced pack is a normal variant", () => {
    const offers = pickShopOffers({
      ...baseArgs(mulberry32(6)),
      forcedPackPools: ["standard"],
    });
    const standard = packs(offers).find(
      (o) => o.kind === "pack" && o.pack.pool === "standard",
    );
    expect(standard?.kind === "pack" && standard.pack.variant).toBe("normal");
  });

  test("an empty forcedPackPools array leaves the shop unchanged", () => {
    const baseline = pickShopOffers(baseArgs(mulberry32(7)));
    const withEmpty = pickShopOffers({
      ...baseArgs(mulberry32(7)),
      forcedPackPools: [],
    });
    expect(packs(withEmpty).length).toBe(packs(baseline).length);
  });
});

describe("buildFreeJokerOffers", () => {
  const catalog = createJokerCatalog();

  test("returns one offer per requested rarity", () => {
    const offers = buildFreeJokerOffers(["uncommon"], catalog, new Set(), () => 0);
    expect(offers).toHaveLength(1);
  });

  test("the injected joker offer is priced at $0", () => {
    const offers = buildFreeJokerOffers(["rare"], catalog, new Set(), () => 0);
    expect(offers[0]?.price).toBe(0);
  });

  test("the injected joker matches the requested rarity", () => {
    const offer = buildFreeJokerOffers(["uncommon"], catalog, new Set(), () => 0)[0];
    if (offer?.kind !== "joker") throw new Error("expected a joker offer");
    expect(offer.joker.rarity).toBe("uncommon");
  });

  test("no rarities requested yields no offers (negative)", () => {
    expect(buildFreeJokerOffers([], catalog, new Set(), () => 0)).toHaveLength(0);
  });

  test("excludes jokers the player already owns (negative)", () => {
    const ownedIds = new Set(
      catalog.filter((j) => j.rarity === "uncommon").map((j) => j.id),
    );
    expect(buildFreeJokerOffers(["uncommon"], catalog, ownedIds, () => 0)).toHaveLength(0);
  });
});

describe("applyEditionToFirstJoker", () => {
  const catalog = createJokerCatalog();
  const jokerOffer = (joker = catalog[0]): ShopItem => ({
    kind: "joker",
    joker,
    price: 5,
    sold: false,
  });

  test("applies the edition to the first base-edition joker offer", () => {
    const result = applyEditionToFirstJoker([jokerOffer()], "foil")[0];
    if (result?.kind !== "joker") throw new Error("expected a joker offer");
    expect(result.joker.edition).toBe("foil");
  });

  test("makes the editioned joker free", () => {
    const result = applyEditionToFirstJoker([jokerOffer()], "polychrome")[0];
    expect(result?.price).toBe(0);
  });

  test("skips a joker offer that already has an edition", () => {
    const editioned = { ...catalog[0], edition: "negative" as const };
    const base = catalog[1];
    const result = applyEditionToFirstJoker(
      [jokerOffer(editioned), jokerOffer(base)],
      "foil",
    );
    const second = result[1];
    if (second?.kind !== "joker") throw new Error("expected a joker offer");
    expect(second.joker.edition).toBe("foil");
  });

  test("leaves an already-editioned offer untouched when it is skipped (negative)", () => {
    const editioned = { ...catalog[0], edition: "negative" as const };
    const result = applyEditionToFirstJoker(
      [jokerOffer(editioned), jokerOffer(catalog[1])],
      "foil",
    );
    const first = result[0];
    if (first?.kind !== "joker") throw new Error("expected a joker offer");
    expect(first.joker.edition).toBe("negative");
  });

  test("is a no-op when there are no joker offers (negative)", () => {
    const planetOffer: ShopItem = {
      kind: "planet",
      planet: createPlanetCatalog()[0],
      price: 3,
      sold: false,
    };
    expect(applyEditionToFirstJoker([planetOffer], "foil")[0]).toEqual(planetOffer);
  });
});

describe("ensureBaseJokerForEdition", () => {
  const catalog = createJokerCatalog();
  const planetOffer = (): ShopItem => ({
    kind: "planet",
    planet: createPlanetCatalog()[0],
    price: 3,
    sold: false,
  });
  const tarotOffer = (): ShopItem => ({
    kind: "tarot",
    tarot: createTarotCatalog()[0],
    price: 3,
    sold: false,
  });

  test("replaces a planet slot with a base-edition joker when none exists", () => {
    const result = ensureBaseJokerForEdition(
      [planetOffer(), tarotOffer()],
      catalog,
      new Set(),
      () => 0,
    );
    expect(result[0]?.kind).toBe("joker");
  });

  test("makes the injected joker priced at the standard joker price", () => {
    const result = ensureBaseJokerForEdition(
      [planetOffer()],
      catalog,
      new Set(),
      () => 0,
    );
    expect(result[0]?.price).toBe(5);
  });

  test("is a no-op when a base-edition joker is already present", () => {
    const existing: ShopItem = {
      kind: "joker",
      joker: catalog[0],
      price: 5,
      sold: false,
    };
    const result = ensureBaseJokerForEdition(
      [existing, planetOffer()],
      catalog,
      new Set(),
      () => 0,
    );
    expect(result).toEqual([existing, planetOffer()]);
  });

  test("excludes owned jokers when picking the injected joker (negative)", () => {
    const result = ensureBaseJokerForEdition(
      [planetOffer()],
      catalog,
      new Set([catalog[0].id]),
      () => 0,
    );
    if (result[0]?.kind !== "joker") throw new Error("expected joker");
    expect(result[0].joker.id).not.toBe(catalog[0].id);
  });

  test("prepends a fresh base joker when no non-pack slot is replaceable", () => {
    const editioned: ShopItem = {
      kind: "joker",
      joker: { ...catalog[0], edition: "foil" as const },
      price: 0,
      sold: false,
    };
    const result = ensureBaseJokerForEdition(
      [editioned],
      catalog,
      new Set(),
      () => 0,
    );
    expect(result).toHaveLength(2);
  });
});

describe("mergeFreeJokerOffersIntoShop (#603)", () => {
  const catalog = createJokerCatalog();
  const planet = createPlanetCatalog()[0];
  const jokerItem = (id: string, price = 5): ShopItem => ({
    kind: "joker",
    joker: { ...catalog[0], id },
    price,
    sold: false,
  });
  const planetItem = (): ShopItem => ({
    kind: "planet",
    planet,
    price: 3,
    sold: false,
  });
  const packItem = (): ShopItem => ({
    kind: "pack",
    pack: { pool: "celestial", variant: "normal", options: [] },
    price: 4,
    sold: false,
  });
  const freeJoker = (id: string): ShopItem => ({
    kind: "joker",
    joker: { ...catalog[0], id },
    price: 0,
    sold: false,
  });

  test("returns the base offers unchanged when there are no free jokers", () => {
    const base = [jokerItem("j1"), planetItem(), packItem()];
    expect(mergeFreeJokerOffersIntoShop(base, [])).toEqual(base);
  });

  test("keeps the total item-offer count stable when a free joker is added", () => {
    const base = [jokerItem("j1"), planetItem(), packItem(), packItem()];
    const merged = mergeFreeJokerOffersIntoShop(base, [freeJoker("free")]);
    const items = merged.filter((o) => o.kind !== "pack");
    expect(items).toHaveLength(2);
  });

  test("the free joker occupies the first item slot", () => {
    const base = [jokerItem("j1"), planetItem(), packItem()];
    const merged = mergeFreeJokerOffersIntoShop(base, [freeJoker("free")]);
    const firstItem = merged.find((o) => o.kind !== "pack");
    if (firstItem?.kind !== "joker") throw new Error("expected joker first");
    expect(firstItem.joker.id).toBe("free");
  });

  test("drops the trailing base item to make room for the free joker", () => {
    const base = [jokerItem("j1"), planetItem(), packItem()];
    const merged = mergeFreeJokerOffersIntoShop(base, [freeJoker("free")]);
    const items = merged.filter((o) => o.kind !== "pack");
    const itemIds = items.map((o) =>
      o.kind === "joker" ? o.joker.id : `planet:${o.kind === "planet" ? "yes" : "no"}`,
    );
    expect(itemIds).not.toContain("planet:yes");
  });

  test("preserves all pack offers unchanged", () => {
    const base = [
      jokerItem("j1"),
      planetItem(),
      packItem(),
      packItem(),
    ];
    const merged = mergeFreeJokerOffersIntoShop(base, [freeJoker("free")]);
    expect(merged.filter((o) => o.kind === "pack")).toHaveLength(2);
  });

  test("two free jokers consume both item slots", () => {
    const base = [jokerItem("j1"), planetItem(), packItem()];
    const merged = mergeFreeJokerOffersIntoShop(base, [
      freeJoker("f1"),
      freeJoker("f2"),
    ]);
    const items = merged.filter((o) => o.kind !== "pack");
    expect(items.every((o) => o.kind === "joker" && o.price === 0)).toBe(true);
  });

  test("free jokers exceeding item-slot count are truncated (no growth)", () => {
    const base = [jokerItem("j1"), packItem()];
    const merged = mergeFreeJokerOffersIntoShop(base, [
      freeJoker("f1"),
      freeJoker("f2"),
      freeJoker("f3"),
    ]);
    const items = merged.filter((o) => o.kind !== "pack");
    expect(items).toHaveLength(1);
  });

  test("an Overstock-style extra item slot is respected (3 items stay 3)", () => {
    const base = [
      jokerItem("j1"),
      jokerItem("j2"),
      planetItem(),
      packItem(),
    ];
    const merged = mergeFreeJokerOffersIntoShop(base, [freeJoker("free")]);
    const items = merged.filter((o) => o.kind !== "pack");
    expect(items).toHaveLength(3);
  });
});

describe("jokerOfferPrice (#577)", () => {
  test("a vanilla joker is priced at JOKER_BASE_PRICE", () => {
    const joker = createJokerCatalog()[0];
    expect(jokerOfferPrice(joker)).toBe(JOKER_BASE_PRICE);
  });

  test("a rental joker is priced at RENTAL_BASE_PRICE", () => {
    const base = createJokerCatalog()[0];
    const rental = { ...base, stickers: [{ kind: "rental" as const }] };
    expect(jokerOfferPrice(rental)).toBe(RENTAL_BASE_PRICE);
  });

  test("a non-rental sticker doesn't lower the price (negative)", () => {
    const base = createJokerCatalog()[0];
    const eternal = { ...base, stickers: [{ kind: "eternal" as const }] };
    expect(jokerOfferPrice(eternal)).toBe(JOKER_BASE_PRICE);
  });
});

describe("applyStakeStickersToShopOffers (#555)", () => {
  function jokerOffer(id: string): ShopItem {
    const joker = { ...createBusinessCardJoker(), id };
    return { kind: "joker", joker, price: JOKER_BASE_PRICE, sold: false };
  }

  function packOfferWithJokerOption(jokerId: string): ShopItem {
    const joker = { ...createBusinessCardJoker(), id: jokerId };
    return {
      kind: "pack",
      pack: {
        pool: "buffoon",
        variant: "normal",
        options: [{ kind: "joker", joker }],
      },
      price: 4,
      sold: false,
    };
  }

  test("is a no-op when odds is undefined", () => {
    const offers = [jokerOffer("j1")];
    expect(applyStakeStickersToShopOffers(offers, undefined)).toEqual(offers);
  });

  test("stamps Eternal onto a shop joker offer when the roll succeeds", () => {
    const offers = [jokerOffer("j1")];
    const stamped = applyStakeStickersToShopOffers(
      offers,
      { eternal: 1 },
      () => 0,
    );
    expect(stamped[0].kind === "joker" && stamped[0].joker.stickers).toEqual([
      { kind: "eternal" },
    ]);
  });

  test("does not stamp Eternal when the roll fails (negative)", () => {
    const offers = [jokerOffer("j1")];
    const stamped = applyStakeStickersToShopOffers(
      offers,
      { eternal: 0.1 },
      () => 0.9,
    );
    expect(stamped[0].kind === "joker" && stamped[0].joker.stickers).toBeUndefined();
  });

  test("Eternal sticker does not change the joker's price (#555)", () => {
    const offers = [jokerOffer("j1")];
    const stamped = applyStakeStickersToShopOffers(
      offers,
      { eternal: 1 },
      () => 0,
    );
    expect(stamped[0].kind === "joker" && stamped[0].price).toBe(JOKER_BASE_PRICE);
  });

  test("Rental sticker overrides the joker's price to RENTAL_BASE_PRICE", () => {
    const offers = [jokerOffer("j1")];
    const stamped = applyStakeStickersToShopOffers(
      offers,
      { rental: 1 },
      () => 0,
    );
    expect(stamped[0].kind === "joker" && stamped[0].price).toBe(RENTAL_BASE_PRICE);
  });

  test("a free-tag joker offer (price 0) stays $0 even after rental is stamped", () => {
    const free = { ...jokerOffer("j1"), price: 0 };
    const stamped = applyStakeStickersToShopOffers(
      [free],
      { rental: 1 },
      () => 0,
    );
    expect(stamped[0].kind === "joker" && stamped[0].price).toBe(0);
  });

  test("stamps Eternal on a Buffoon pack's joker option when the roll succeeds", () => {
    const offers = [packOfferWithJokerOption("p1")];
    const stamped = applyStakeStickersToShopOffers(
      offers,
      { eternal: 1 },
      () => 0,
    );
    const opt = stamped[0].kind === "pack" ? stamped[0].pack.options[0] : null;
    expect(opt && opt.kind === "joker" ? opt.joker.stickers : null).toEqual([
      { kind: "eternal" },
    ]);
  });

  test("non-joker offers pass through unchanged", () => {
    const offer: ShopItem = {
      kind: "tarot",
      tarot: createTarotCatalog()[0],
      price: 3,
      sold: false,
    };
    const stamped = applyStakeStickersToShopOffers([offer], { eternal: 1 }, () => 0);
    expect(stamped[0]).toEqual(offer);
  });
});

describe("applyAstronomerPricing (#741)", () => {
  function planetOffer(id: string, price = 3): ShopItem {
    const planet = createPlanetCatalog().find((p) => p.id === id);
    if (!planet) throw new Error(`no planet ${id}`);
    return { kind: "planet", planet, price, sold: false };
  }

  function tarotOffer(price = 3): ShopItem {
    return {
      kind: "tarot",
      tarot: createTarotCatalog()[0],
      price,
      sold: false,
    };
  }

  function celestialPackOffer(price = 4): ShopItem {
    return {
      kind: "pack",
      pack: { pool: "celestial", variant: "normal", options: [] },
      price,
      sold: false,
    };
  }

  function buffoonPackOffer(price = 4): ShopItem {
    return {
      kind: "pack",
      pack: { pool: "buffoon", variant: "normal", options: [] },
      price,
      sold: false,
    };
  }

  test("is a no-op when Astronomer is not active", () => {
    const offers = [planetOffer("jupiter"), celestialPackOffer()];
    expect(applyAstronomerPricing(offers, false)).toEqual(offers);
  });

  test("zeroes the price of every Planet offer when Astronomer is active", () => {
    const offers = [planetOffer("jupiter", 3)];
    const out = applyAstronomerPricing(offers, true);
    expect(out[0].kind === "planet" && out[0].price).toBe(0);
  });

  test("zeroes the price of every Celestial pack offer when Astronomer is active", () => {
    const offers = [celestialPackOffer(4)];
    const out = applyAstronomerPricing(offers, true);
    expect(out[0].kind === "pack" && out[0].price).toBe(0);
  });

  test("does not change Tarot offer prices (negative — other kinds untouched)", () => {
    const offers = [tarotOffer(3)];
    const out = applyAstronomerPricing(offers, true);
    expect(out[0].kind === "tarot" && out[0].price).toBe(3);
  });

  test("does not change Buffoon pack prices (negative — only Celestial is free)", () => {
    const offers = [buffoonPackOffer(4)];
    const out = applyAstronomerPricing(offers, true);
    expect(out[0].kind === "pack" && out[0].price).toBe(4);
  });
});

describe("Telescope: guaranteedPlanetId on forced Celestial pack (#281)", () => {
  test("a forced Celestial pack with a guaranteedPlanetId always includes that planet", () => {
    const offers = pickShopOffers({
      jokerCatalog: createJokerCatalog(),
      excludedJokerIds: [],
      planetCatalog: createPlanetCatalog(),
      tarotCatalog: createTarotCatalog(),
      spectralCatalog: createSpectralCatalog(),
      forcedPackPools: ["celestial"],
      guaranteedPlanetId: "jupiter",
      rng: () => 0.5,
    });
    const pack = offers.find((o) => o.kind === "pack");
    const ids =
      pack && pack.kind === "pack"
        ? pack.pack.options.flatMap((o) =>
            o.kind === "planet" ? [o.planet.id] : [],
          )
        : [];
    expect(ids).toContain("jupiter");
  });

  test("a forced Celestial pack without a guaranteedPlanetId does not always include Jupiter (negative)", () => {
    const offers = pickShopOffers({
      jokerCatalog: createJokerCatalog(),
      excludedJokerIds: [],
      planetCatalog: createPlanetCatalog(),
      tarotCatalog: createTarotCatalog(),
      spectralCatalog: createSpectralCatalog(),
      forcedPackPools: ["celestial"],
      rng: () => 0.001,
    });
    const pack = offers.find((o) => o.kind === "pack");
    const ids =
      pack && pack.kind === "pack"
        ? pack.pack.options.flatMap((o) =>
            o.kind === "planet" ? [o.planet.id] : [],
          )
        : [];
    expect(ids).not.toContain("jupiter");
  });
});
