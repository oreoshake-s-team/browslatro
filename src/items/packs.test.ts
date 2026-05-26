// @vitest-environment node
import {
  PACK_JUMBO_PRICE,
  PACK_MEGA_PRICE,
  PACK_NORMAL_PRICE,
  PACK_VARIANT_WEIGHTS,
  packDisplayName,
  packOptionsCount,
  packPickLimit,
  packPrice,
  rollPack,
  rollPackOptions,
  rollPackVariant,
} from "./packs";
import { createPlanetCatalog } from "./planets";
import { createTarotCatalog } from "./tarots";

function seededRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

describe("Pack option counts", () => {
  test("Celestial Normal has 3 options", () => {
    expect(packOptionsCount("celestial", "normal")).toBe(3);
  });

  test("Celestial Jumbo has 5 options", () => {
    expect(packOptionsCount("celestial", "jumbo")).toBe(5);
  });

  test("Celestial Mega has 5 options", () => {
    expect(packOptionsCount("celestial", "mega")).toBe(5);
  });
});

describe("Pack pick limits", () => {
  test("Normal picks 1", () => {
    expect(packPickLimit("normal")).toBe(1);
  });

  test("Jumbo picks 1", () => {
    expect(packPickLimit("jumbo")).toBe(1);
  });

  test("Mega picks 2", () => {
    expect(packPickLimit("mega")).toBe(2);
  });
});

describe("Pack prices", () => {
  test("Normal pack costs $4", () => {
    expect(packPrice("normal")).toBe(PACK_NORMAL_PRICE);
  });

  test("Jumbo pack costs $6", () => {
    expect(packPrice("jumbo")).toBe(PACK_JUMBO_PRICE);
  });

  test("Mega pack costs $8", () => {
    expect(packPrice("mega")).toBe(PACK_MEGA_PRICE);
  });
});

describe("Pack display name", () => {
  test("Celestial Normal label drops the variant prefix", () => {
    expect(
      packDisplayName({ pool: "celestial", variant: "normal", options: [] }),
    ).toBe("Celestial Pack");
  });

  test("Celestial Jumbo prefixes Jumbo", () => {
    expect(
      packDisplayName({ pool: "celestial", variant: "jumbo", options: [] }),
    ).toBe("Jumbo Celestial Pack");
  });

  test("Celestial Mega prefixes Mega", () => {
    expect(
      packDisplayName({ pool: "celestial", variant: "mega", options: [] }),
    ).toBe("Mega Celestial Pack");
  });
});

describe("rollPackOptions for Celestial", () => {
  test("returns Normal-count distinct planets", () => {
    const opts = rollPackOptions({
      pool: "celestial",
      variant: "normal",
      planetCatalog: createPlanetCatalog(),
      tarotCatalog: createTarotCatalog(),
      rng: seededRng(1),
    });
    expect(opts).toHaveLength(3);
  });

  test("returns Jumbo-count distinct planets", () => {
    const opts = rollPackOptions({
      pool: "celestial",
      variant: "jumbo",
      planetCatalog: createPlanetCatalog(),
      tarotCatalog: createTarotCatalog(),
      rng: seededRng(2),
    });
    expect(opts).toHaveLength(5);
  });

  test("returns Mega-count distinct planets", () => {
    const opts = rollPackOptions({
      pool: "celestial",
      variant: "mega",
      planetCatalog: createPlanetCatalog(),
      tarotCatalog: createTarotCatalog(),
      rng: seededRng(3),
    });
    expect(opts).toHaveLength(5);
  });

  test("options contain no duplicate planet ids", () => {
    const opts = rollPackOptions({
      pool: "celestial",
      variant: "jumbo",
      planetCatalog: createPlanetCatalog(),
      tarotCatalog: createTarotCatalog(),
      rng: seededRng(4),
    });
    const ids = new Set(opts.map((o) => (o.kind === "planet" ? o.planet.id : "")));
    expect(ids.size).toBe(opts.length);
  });

  test("returns at most the catalog size when catalog is small", () => {
    const small = createPlanetCatalog().slice(0, 2);
    const opts = rollPackOptions({
      pool: "celestial",
      variant: "normal",
      planetCatalog: small,
      tarotCatalog: createTarotCatalog(),
      rng: seededRng(5),
    });
    expect(opts).toHaveLength(small.length);
  });
});

describe("rollPackVariant", () => {
  test("Normal is the most common variant under uniform RNG", () => {
    const counts = { normal: 0, jumbo: 0, mega: 0 };
    const rng = seededRng(42);
    for (let i = 0; i < 2000; i += 1) counts[rollPackVariant(rng)] += 1;
    expect(counts.normal).toBeGreaterThan(counts.jumbo);
  });

  test("Mega is the rarest variant under uniform RNG", () => {
    const counts = { normal: 0, jumbo: 0, mega: 0 };
    const rng = seededRng(99);
    for (let i = 0; i < 2000; i += 1) counts[rollPackVariant(rng)] += 1;
    expect(counts.mega).toBeLessThan(counts.jumbo);
  });

  test("PACK_VARIANT_WEIGHTS define Mega as the lowest weight", () => {
    expect(PACK_VARIANT_WEIGHTS.mega).toBeLessThan(PACK_VARIANT_WEIGHTS.jumbo);
  });
});

describe("rollPack", () => {
  test("produces a pack from one of the registered pools", () => {
    const offer = rollPack({
      planetCatalog: createPlanetCatalog(),
      tarotCatalog: createTarotCatalog(),
      rng: seededRng(7),
    });
    expect(["celestial", "arcana"]).toContain(offer.pool);
  });

  test("rolled options length matches the variant's option count", () => {
    const offer = rollPack({
      planetCatalog: createPlanetCatalog(),
      tarotCatalog: createTarotCatalog(),
      rng: seededRng(11),
    });
    expect(offer.options).toHaveLength(packOptionsCount(offer.pool, offer.variant));
  });
});

describe("Arcana pack", () => {
  test("Normal has 3 options", () => {
    expect(packOptionsCount("arcana", "normal")).toBe(3);
  });

  test("Jumbo has 5 options", () => {
    expect(packOptionsCount("arcana", "jumbo")).toBe(5);
  });

  test("Mega has 5 options", () => {
    expect(packOptionsCount("arcana", "mega")).toBe(5);
  });

  test("display name for Normal is 'Arcana Pack'", () => {
    expect(
      packDisplayName({ pool: "arcana", variant: "normal", options: [] }),
    ).toBe("Arcana Pack");
  });

  test("display name for Jumbo prefixes Jumbo", () => {
    expect(
      packDisplayName({ pool: "arcana", variant: "jumbo", options: [] }),
    ).toBe("Jumbo Arcana Pack");
  });

  test("display name for Mega prefixes Mega", () => {
    expect(
      packDisplayName({ pool: "arcana", variant: "mega", options: [] }),
    ).toBe("Mega Arcana Pack");
  });

  test("rollPackOptions returns tarot options for arcana", () => {
    const opts = rollPackOptions({
      pool: "arcana",
      variant: "normal",
      planetCatalog: createPlanetCatalog(),
      tarotCatalog: createTarotCatalog(),
      rng: seededRng(31),
    });
    expect(opts.every((o) => o.kind === "tarot")).toBe(true);
  });

  test("Normal returns 3 tarot options", () => {
    const opts = rollPackOptions({
      pool: "arcana",
      variant: "normal",
      planetCatalog: createPlanetCatalog(),
      tarotCatalog: createTarotCatalog(),
      rng: seededRng(32),
    });
    expect(opts).toHaveLength(3);
  });

  test("Jumbo returns 5 tarot options", () => {
    const opts = rollPackOptions({
      pool: "arcana",
      variant: "jumbo",
      planetCatalog: createPlanetCatalog(),
      tarotCatalog: createTarotCatalog(),
      rng: seededRng(33),
    });
    expect(opts).toHaveLength(5);
  });

  test("Mega returns 5 tarot options", () => {
    const opts = rollPackOptions({
      pool: "arcana",
      variant: "mega",
      planetCatalog: createPlanetCatalog(),
      tarotCatalog: createTarotCatalog(),
      rng: seededRng(34),
    });
    expect(opts).toHaveLength(5);
  });

  test("returned tarot ids are unique within a pack", () => {
    const opts = rollPackOptions({
      pool: "arcana",
      variant: "mega",
      planetCatalog: createPlanetCatalog(),
      tarotCatalog: createTarotCatalog(),
      rng: seededRng(35),
    });
    const ids = new Set(opts.map((o) => (o.kind === "tarot" ? o.tarot.id : "")));
    expect(ids.size).toBe(opts.length);
  });

  test("arcana is more likely than celestial under uniform RNG", () => {
    const counts: Record<string, number> = { celestial: 0, arcana: 0 };
    const rng = seededRng(101);
    for (let i = 0; i < 1000; i += 1) {
      const offer = rollPack({
        planetCatalog: createPlanetCatalog(),
        tarotCatalog: createTarotCatalog(),
        rng,
      });
      counts[offer.pool] += 1;
    }
    expect(counts.arcana).toBeGreaterThan(counts.celestial);
  });
});
