// @vitest-environment node
import { describe, expect, test } from "vitest";
import { createJokerCatalog, type RandomSource } from "./jokers";
import { createPlanetCatalog } from "./planets";
import { createSpectralCatalog } from "./spectrals";
import { createTarotCatalog } from "./tarots";
import {
  pickShopItemOffers,
  pickSingleShopOffer,
  SHOP_OFFER_SLOTS,
  type ShopItem,
} from "./shop";
import {
  offerKindWeights,
  VOUCHER_BASE_PRICE,
  VOUCHER_CATALOG,
  type VoucherId,
} from "./vouchers";

function ownedSet(ids: ReadonlyArray<VoucherId>): ReadonlySet<VoucherId> {
  return new Set(ids);
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

function baseShopArgs(
  rng: RandomSource,
): Parameters<typeof pickShopItemOffers>[0] {
  return {
    jokerCatalog: createJokerCatalog(),
    excludedJokerIds: [],
    planetCatalog: createPlanetCatalog(),
    tarotCatalog: createTarotCatalog(),
    spectralCatalog: createSpectralCatalog(),
    extraSlots: 24,
    rng,
  };
}

function planetShare(offers: ReadonlyArray<ShopItem>): number {
  const item = offers.filter((o) => o.kind !== "pack" && o.kind !== "spectral");
  if (item.length === 0) return 0;
  const planets = item.filter((o) => o.kind === "planet").length;
  return planets / item.length;
}

describe("Planet Merchant + Planet Tycoon catalog entries", () => {
  test("planet-merchant is in the catalog", () => {
    expect(VOUCHER_CATALOG.some((v) => v.id === "planet-merchant")).toBe(true);
  });

  test("planet-merchant has no prerequisite", () => {
    const v = VOUCHER_CATALOG.find((x) => x.id === "planet-merchant");
    expect(v?.requires).toBeUndefined();
  });

  test("planet-merchant costs the standard voucher base price", () => {
    const v = VOUCHER_CATALOG.find((x) => x.id === "planet-merchant");
    expect(v?.cost).toBe(VOUCHER_BASE_PRICE);
  });

  test("planet-tycoon is in the catalog", () => {
    expect(VOUCHER_CATALOG.some((v) => v.id === "planet-tycoon")).toBe(true);
  });

  test("planet-tycoon requires planet-merchant", () => {
    const v = VOUCHER_CATALOG.find((x) => x.id === "planet-tycoon");
    expect(v?.requires).toBe("planet-merchant");
  });

  test("planet-tycoon costs the standard voucher base price", () => {
    const v = VOUCHER_CATALOG.find((x) => x.id === "planet-tycoon");
    expect(v?.cost).toBe(VOUCHER_BASE_PRICE);
  });
});

describe("offerKindWeights — Planet Merchant / Tycoon", () => {
  test("planet-merchant doubles the planet weight", () => {
    expect(offerKindWeights(ownedSet(["planet-merchant"]))).toEqual({
      joker: 1,
      planet: 2,
      tarot: 1,
    });
  });

  test("planet-merchant + planet-tycoon quadruple the planet weight", () => {
    expect(
      offerKindWeights(ownedSet(["planet-merchant", "planet-tycoon"])),
    ).toEqual({ joker: 1, planet: 4, tarot: 1 });
  });

  test("planet-tycoon without planet-merchant still yields 4× (tycoon flag dominates)", () => {
    expect(offerKindWeights(ownedSet(["planet-tycoon"])).planet).toBe(4);
  });

  test("non-planet vouchers leave the planet weight at 1", () => {
    expect(
      offerKindWeights(ownedSet(["tarot-merchant", "tarot-tycoon"])).planet,
    ).toBe(1);
  });

  test("planet-merchant leaves the joker weight at 1", () => {
    expect(offerKindWeights(ownedSet(["planet-merchant"])).joker).toBe(1);
  });

  test("planet-merchant leaves the tarot weight at 1", () => {
    expect(offerKindWeights(ownedSet(["planet-merchant"])).tarot).toBe(1);
  });
});

describe("pickShopItemOffers — weighted planet distribution", () => {
  test("planet share with Planet Tycoon is meaningfully higher than baseline", () => {
    const baselineOffers = pickShopItemOffers(baseShopArgs(mulberry32(42)));
    const tycoonOffers = pickShopItemOffers({
      ...baseShopArgs(mulberry32(42)),
      kindWeights: offerKindWeights(
        ownedSet(["planet-merchant", "planet-tycoon"]),
      ),
    });
    expect(planetShare(tycoonOffers)).toBeGreaterThan(
      planetShare(baselineOffers),
    );
  });

  test("without Merchant/Tycoon the planet share stays near the uniform 1/3 baseline", () => {
    let totalPlanet = 0;
    let totalItem = 0;
    for (let seed = 1; seed <= 25; seed += 1) {
      const offers = pickShopItemOffers(baseShopArgs(mulberry32(seed)));
      const items = offers.filter(
        (o) => o.kind !== "pack" && o.kind !== "spectral",
      );
      totalItem += items.length;
      totalPlanet += items.filter((o) => o.kind === "planet").length;
    }
    const share = totalPlanet / totalItem;
    expect(share).toBeGreaterThan(0.2);
    expect(share).toBeLessThan(0.5);
  });

  test("with Planet Tycoon, planets account for the majority of common offers", () => {
    let totalPlanet = 0;
    let totalItem = 0;
    for (let seed = 1; seed <= 25; seed += 1) {
      const offers = pickShopItemOffers({
        ...baseShopArgs(mulberry32(seed)),
        kindWeights: offerKindWeights(
          ownedSet(["planet-merchant", "planet-tycoon"]),
        ),
      });
      const items = offers.filter(
        (o) => o.kind !== "pack" && o.kind !== "spectral",
      );
      totalItem += items.length;
      totalPlanet += items.filter((o) => o.kind === "planet").length;
    }
    expect(totalPlanet / totalItem).toBeGreaterThan(0.5);
  });

  test("owning Planet Merchant produces meaningfully more planet offers than not owning it", () => {
    let baselinePlanet = 0;
    let merchantPlanet = 0;
    for (let seed = 1; seed <= 25; seed += 1) {
      const baseline = pickShopItemOffers(baseShopArgs(mulberry32(seed)));
      const merchant = pickShopItemOffers({
        ...baseShopArgs(mulberry32(seed)),
        kindWeights: offerKindWeights(ownedSet(["planet-merchant"])),
      });
      baselinePlanet += baseline.filter((o) => o.kind === "planet").length;
      merchantPlanet += merchant.filter((o) => o.kind === "planet").length;
    }
    expect(merchantPlanet).toBeGreaterThan(baselinePlanet);
  });
});

describe("pickSingleShopOffer — weighted picks for reroll/Overstock", () => {
  test("Planet Tycoon shifts the planet share well above the uniform 1/3 baseline", () => {
    let baselinePlanet = 0;
    let tycoonPlanet = 0;
    const trials = 60;
    for (let seed = 1; seed <= trials; seed += 1) {
      const baseline = pickSingleShopOffer(
        {
          ...baseShopArgs(mulberry32(seed)),
          extraSlots: 0,
        },
        [],
      );
      const tycoon = pickSingleShopOffer(
        {
          ...baseShopArgs(mulberry32(seed)),
          extraSlots: 0,
          kindWeights: offerKindWeights(
            ownedSet(["planet-merchant", "planet-tycoon"]),
          ),
        },
        [],
      );
      if (baseline?.kind === "planet") baselinePlanet += 1;
      if (tycoon?.kind === "planet") tycoonPlanet += 1;
    }
    expect(tycoonPlanet).toBeGreaterThan(baselinePlanet);
  });
});

describe("PickShopOffersArgs — kindWeights remains optional (back-compat)", () => {
  test("omitting kindWeights still returns up to SHOP_OFFER_SLOTS item offers", () => {
    const offers = pickShopItemOffers({
      ...baseShopArgs(mulberry32(7)),
      extraSlots: 0,
    });
    expect(offers.length).toBeLessThanOrEqual(SHOP_OFFER_SLOTS);
  });
});
