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

function tarotShare(offers: ReadonlyArray<ShopItem>): number {
  const item = offers.filter((o) => o.kind !== "pack" && o.kind !== "spectral");
  if (item.length === 0) return 0;
  const tarots = item.filter((o) => o.kind === "tarot").length;
  return tarots / item.length;
}

describe("Tarot Merchant + Tarot Tycoon catalog entries", () => {
  test("tarot-merchant is in the catalog", () => {
    expect(VOUCHER_CATALOG.some((v) => v.id === "tarot-merchant")).toBe(true);
  });

  test("tarot-merchant has no prerequisite", () => {
    const v = VOUCHER_CATALOG.find((x) => x.id === "tarot-merchant");
    expect(v?.requires).toBeUndefined();
  });

  test("tarot-tycoon is in the catalog", () => {
    expect(VOUCHER_CATALOG.some((v) => v.id === "tarot-tycoon")).toBe(true);
  });

  test("tarot-tycoon requires tarot-merchant", () => {
    const v = VOUCHER_CATALOG.find((x) => x.id === "tarot-tycoon");
    expect(v?.requires).toBe("tarot-merchant");
  });
});

describe("offerKindWeights", () => {
  test("returns 1 for every common kind with no vouchers owned", () => {
    expect(offerKindWeights(ownedSet([]))).toEqual({
      joker: 1,
      planet: 1,
      tarot: 1,
    });
  });

  test("tarot-merchant doubles the tarot weight", () => {
    expect(offerKindWeights(ownedSet(["tarot-merchant"])).tarot).toBe(2);
  });

  test("tarot-merchant leaves joker weight at 1", () => {
    expect(offerKindWeights(ownedSet(["tarot-merchant"])).joker).toBe(1);
  });

  test("tarot-merchant leaves planet weight at 1", () => {
    expect(offerKindWeights(ownedSet(["tarot-merchant"])).planet).toBe(1);
  });

  test("tarot-tycoon quadruples the tarot weight", () => {
    expect(
      offerKindWeights(ownedSet(["tarot-merchant", "tarot-tycoon"])).tarot,
    ).toBe(4);
  });

  test("tycoon supersedes merchant when both are owned (4×, not 2×)", () => {
    expect(
      offerKindWeights(ownedSet(["tarot-merchant", "tarot-tycoon"])).tarot,
    ).toBe(4);
  });
});

describe("pickShopItemOffers — weighted tarot distribution", () => {
  test("tarot share with Tarot Tycoon is meaningfully higher than baseline", () => {
    const args = baseShopArgs(mulberry32(42));
    const baselineOffers = pickShopItemOffers(args);
    const tycoonOffers = pickShopItemOffers({
      ...baseShopArgs(mulberry32(42)),
      kindWeights: offerKindWeights(ownedSet(["tarot-merchant", "tarot-tycoon"])),
    });
    expect(tarotShare(tycoonOffers)).toBeGreaterThan(tarotShare(baselineOffers));
  });

  test("without Merchant/Tycoon the tarot share stays near the uniform 1/3 baseline", () => {
    let totalTarot = 0;
    let totalItem = 0;
    for (let seed = 1; seed <= 25; seed += 1) {
      const offers = pickShopItemOffers(baseShopArgs(mulberry32(seed)));
      const items = offers.filter(
        (o) => o.kind !== "pack" && o.kind !== "spectral",
      );
      totalItem += items.length;
      totalTarot += items.filter((o) => o.kind === "tarot").length;
    }
    const share = totalTarot / totalItem;
    expect(share).toBeGreaterThan(0.2);
    expect(share).toBeLessThan(0.5);
  });

  test("with Tarot Tycoon, tarots account for the majority of common offers", () => {
    let totalTarot = 0;
    let totalItem = 0;
    for (let seed = 1; seed <= 25; seed += 1) {
      const offers = pickShopItemOffers({
        ...baseShopArgs(mulberry32(seed)),
        kindWeights: offerKindWeights(
          ownedSet(["tarot-merchant", "tarot-tycoon"]),
        ),
      });
      const items = offers.filter(
        (o) => o.kind !== "pack" && o.kind !== "spectral",
      );
      totalItem += items.length;
      totalTarot += items.filter((o) => o.kind === "tarot").length;
    }
    expect(totalTarot / totalItem).toBeGreaterThan(0.5);
  });
});

describe("pickSingleShopOffer — weighted picks for reroll/Overstock", () => {
  test("Tarot Tycoon shifts the tarot share well above the uniform 1/3 baseline", () => {
    let baselineTarot = 0;
    let tycoonTarot = 0;
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
            ownedSet(["tarot-merchant", "tarot-tycoon"]),
          ),
        },
        [],
      );
      if (baseline?.kind === "tarot") baselineTarot += 1;
      if (tycoon?.kind === "tarot") tycoonTarot += 1;
    }
    expect(tycoonTarot).toBeGreaterThan(baselineTarot);
  });
});

describe("PickShopOffersArgs — kindWeights is optional (back-compat)", () => {
  test("omitting kindWeights still returns up to SHOP_OFFER_SLOTS item offers", () => {
    const offers = pickShopItemOffers({
      ...baseShopArgs(mulberry32(7)),
      extraSlots: 0,
    });
    expect(offers.length).toBeLessThanOrEqual(SHOP_OFFER_SLOTS);
  });
});
