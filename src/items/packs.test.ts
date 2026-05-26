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
      rng: seededRng(1),
    });
    expect(opts).toHaveLength(3);
  });

  test("returns Jumbo-count distinct planets", () => {
    const opts = rollPackOptions({
      pool: "celestial",
      variant: "jumbo",
      planetCatalog: createPlanetCatalog(),
      rng: seededRng(2),
    });
    expect(opts).toHaveLength(5);
  });

  test("returns Mega-count distinct planets", () => {
    const opts = rollPackOptions({
      pool: "celestial",
      variant: "mega",
      planetCatalog: createPlanetCatalog(),
      rng: seededRng(3),
    });
    expect(opts).toHaveLength(5);
  });

  test("options contain no duplicate planet ids", () => {
    const opts = rollPackOptions({
      pool: "celestial",
      variant: "jumbo",
      planetCatalog: createPlanetCatalog(),
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
  test("produces a Celestial pack while celestial is the only registered pool", () => {
    const offer = rollPack({
      planetCatalog: createPlanetCatalog(),
      rng: seededRng(7),
    });
    expect(offer.pool).toBe("celestial");
  });

  test("rolled options length matches the variant's option count", () => {
    const offer = rollPack({
      planetCatalog: createPlanetCatalog(),
      rng: seededRng(11),
    });
    expect(offer.options).toHaveLength(packOptionsCount(offer.pool, offer.variant));
  });
});
