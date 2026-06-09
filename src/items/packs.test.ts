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
  rollPackForPool,
  rollPackOptions,
  rollPackVariant,
  rollStandardCard,
} from "./packs";
import { RANKS, SUITS } from "../cards/deck";
import { createPlanetCatalog } from "./planets";
import { createTarotCatalog } from "./tarots";
import { createJokerCatalog } from "./jokers";
import { createSpectralCatalog } from "./spectrals";
import { chanceOverrideConfig } from "../dev/chanceOverride";
import { sequenceRng } from "../test/rng";

function seededRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

describe("Pack option counts", () => {
  test.each<{ variant: "normal" | "jumbo" | "mega"; count: number }>([
    { variant: "normal", count: 3 },
    { variant: "jumbo", count: 5 },
    { variant: "mega", count: 5 },
  ])("Celestial $variant has $count options", ({ variant, count }) => {
    expect(packOptionsCount("celestial", variant)).toBe(count);
  });
});

describe("Pack pick limits", () => {
  test.each<{ variant: "normal" | "jumbo" | "mega"; picks: number }>([
    { variant: "normal", picks: 1 },
    { variant: "jumbo", picks: 1 },
    { variant: "mega", picks: 2 },
  ])("$variant picks $picks", ({ variant, picks }) => {
    expect(packPickLimit(variant)).toBe(picks);
  });
});

describe("Pack prices", () => {
  test.each<{ variant: "normal" | "jumbo" | "mega"; price: number }>([
    { variant: "normal", price: PACK_NORMAL_PRICE },
    { variant: "jumbo", price: PACK_JUMBO_PRICE },
    { variant: "mega", price: PACK_MEGA_PRICE },
  ])("$variant pack costs the $variant price", ({ variant, price }) => {
    expect(packPrice(variant)).toBe(price);
  });
});

describe("Pack display name", () => {
  test.each<{ variant: "normal" | "jumbo" | "mega"; expected: string }>([
    { variant: "normal", expected: "Celestial Pack" },
    { variant: "jumbo", expected: "Jumbo Celestial Pack" },
    { variant: "mega", expected: "Mega Celestial Pack" },
  ])("Celestial $variant label is $expected", ({ variant, expected }) => {
    expect(
      packDisplayName({ pool: "celestial", variant, options: [] }),
    ).toBe(expected);
  });
});

describe("rollPackOptions for Celestial", () => {
  test.each<{ variant: "normal" | "jumbo" | "mega"; length: number; rngSeed: number }>([
    { variant: "normal", length: 3, rngSeed: 1 },
    { variant: "jumbo", length: 5, rngSeed: 2 },
    { variant: "mega", length: 5, rngSeed: 3 },
  ])("returns $length distinct planets for $variant", ({ variant, length, rngSeed }) => {
    const opts = rollPackOptions({
      pool: "celestial",
      variant,
      planetCatalog: createPlanetCatalog(),
      tarotCatalog: createTarotCatalog(),
      jokerCatalog: createJokerCatalog(),
      spectralCatalog: createSpectralCatalog(),
      rng: seededRng(rngSeed),
    });
    expect(opts).toHaveLength(length);
  });

  test("options contain no duplicate planet ids", () => {
    const opts = rollPackOptions({
      pool: "celestial",
      variant: "jumbo",
      planetCatalog: createPlanetCatalog(),
      tarotCatalog: createTarotCatalog(),
      jokerCatalog: createJokerCatalog(),
      spectralCatalog: createSpectralCatalog(),
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
      jokerCatalog: createJokerCatalog(),
      spectralCatalog: createSpectralCatalog(),
      rng: seededRng(5),
    });
    expect(opts).toHaveLength(small.length);
  });

  test("guaranteedPlanetId always appears in a Celestial pack roll (#281)", () => {
    const opts = rollPackOptions({
      pool: "celestial",
      variant: "normal",
      planetCatalog: createPlanetCatalog(),
      tarotCatalog: createTarotCatalog(),
      jokerCatalog: createJokerCatalog(),
      spectralCatalog: createSpectralCatalog(),
      guaranteedPlanetId: "jupiter",
      rng: seededRng(6),
    });
    const ids = opts.flatMap((o) => (o.kind === "planet" ? [o.planet.id] : []));
    expect(ids).toContain("jupiter");
  });

  test("guaranteedPlanetId does not duplicate the guaranteed planet (#281)", () => {
    const opts = rollPackOptions({
      pool: "celestial",
      variant: "jumbo",
      planetCatalog: createPlanetCatalog(),
      tarotCatalog: createTarotCatalog(),
      jokerCatalog: createJokerCatalog(),
      spectralCatalog: createSpectralCatalog(),
      guaranteedPlanetId: "jupiter",
      rng: seededRng(7),
    });
    const ids = opts.flatMap((o) => (o.kind === "planet" ? [o.planet.id] : []));
    const jupiterCount = ids.filter((id) => id === "jupiter").length;
    expect(jupiterCount).toBe(1);
  });

  test("an unknown guaranteedPlanetId falls back to a normal Celestial roll (negative)", () => {
    const opts = rollPackOptions({
      pool: "celestial",
      variant: "normal",
      planetCatalog: createPlanetCatalog(),
      tarotCatalog: createTarotCatalog(),
      jokerCatalog: createJokerCatalog(),
      spectralCatalog: createSpectralCatalog(),
      guaranteedPlanetId: "nonexistent-planet",
      rng: seededRng(8),
    });
    expect(opts).toHaveLength(3);
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
      jokerCatalog: createJokerCatalog(),
      spectralCatalog: createSpectralCatalog(),
      rng: seededRng(7),
    });
    expect([
      "celestial",
      "arcana",
      "buffoon",
      "spectral",
      "standard",
    ]).toContain(offer.pool);
  });

  test("rolled options length matches the variant's option count", () => {
    const offer = rollPack({
      planetCatalog: createPlanetCatalog(),
      tarotCatalog: createTarotCatalog(),
      jokerCatalog: createJokerCatalog(),
      spectralCatalog: createSpectralCatalog(),
      rng: seededRng(11),
    });
    expect(offer.options).toHaveLength(packOptionsCount(offer.pool, offer.variant));
  });
});

describe("Arcana pack", () => {
  test.each<{ variant: "normal" | "jumbo" | "mega"; count: number }>([
    { variant: "normal", count: 3 },
    { variant: "jumbo", count: 5 },
    { variant: "mega", count: 5 },
  ])("$variant has $count options", ({ variant, count }) => {
    expect(packOptionsCount("arcana", variant)).toBe(count);
  });

  test.each<{ variant: "normal" | "jumbo" | "mega"; expected: string }>([
    { variant: "normal", expected: "Arcana Pack" },
    { variant: "jumbo", expected: "Jumbo Arcana Pack" },
    { variant: "mega", expected: "Mega Arcana Pack" },
  ])("display name for $variant is $expected", ({ variant, expected }) => {
    expect(
      packDisplayName({ pool: "arcana", variant, options: [] }),
    ).toBe(expected);
  });

  test("rollPackOptions returns tarot options for arcana", () => {
    const opts = rollPackOptions({
      pool: "arcana",
      variant: "normal",
      planetCatalog: createPlanetCatalog(),
      tarotCatalog: createTarotCatalog(),
      jokerCatalog: createJokerCatalog(),
      spectralCatalog: createSpectralCatalog(),
      rng: seededRng(31),
    });
    expect(opts.every((o) => o.kind === "tarot")).toBe(true);
  });

  test.each<{ variant: "normal" | "jumbo" | "mega"; length: number; rngSeed: number }>([
    { variant: "normal", length: 3, rngSeed: 32 },
    { variant: "jumbo", length: 5, rngSeed: 33 },
    { variant: "mega", length: 5, rngSeed: 34 },
  ])("$variant returns $length tarot options", ({ variant, length, rngSeed }) => {
    const opts = rollPackOptions({
      pool: "arcana",
      variant,
      planetCatalog: createPlanetCatalog(),
      tarotCatalog: createTarotCatalog(),
      jokerCatalog: createJokerCatalog(),
      spectralCatalog: createSpectralCatalog(),
      rng: seededRng(rngSeed),
    });
    expect(opts).toHaveLength(length);
  });

  test("returned tarot ids are unique within a pack", () => {
    const opts = rollPackOptions({
      pool: "arcana",
      variant: "mega",
      planetCatalog: createPlanetCatalog(),
      tarotCatalog: createTarotCatalog(),
      jokerCatalog: createJokerCatalog(),
      spectralCatalog: createSpectralCatalog(),
      rng: seededRng(35),
    });
    const ids = new Set(opts.map((o) => (o.kind === "tarot" ? o.tarot.id : "")));
    expect(ids.size).toBe(opts.length);
  });

  test("arcana is more likely than celestial under uniform RNG", () => {
    const counts: Record<string, number> = { celestial: 0, arcana: 0, buffoon: 0 };
    const rng = seededRng(101);
    for (let i = 0; i < 1000; i += 1) {
      const offer = rollPack({
        planetCatalog: createPlanetCatalog(),
        tarotCatalog: createTarotCatalog(),
        jokerCatalog: createJokerCatalog(),
      spectralCatalog: createSpectralCatalog(),
        rng,
      });
      counts[offer.pool] += 1;
    }
    expect(counts.arcana).toBeGreaterThan(counts.celestial);
  });
});

describe("Buffoon pack", () => {
  test.each<{ variant: "normal" | "jumbo" | "mega"; count: number }>([
    { variant: "normal", count: 2 },
    { variant: "jumbo", count: 4 },
    { variant: "mega", count: 4 },
  ])("$variant has $count options", ({ variant, count }) => {
    expect(packOptionsCount("buffoon", variant)).toBe(count);
  });

  test.each<{ variant: "normal" | "jumbo" | "mega"; expected: string }>([
    { variant: "normal", expected: "Buffoon Pack" },
    { variant: "jumbo", expected: "Jumbo Buffoon Pack" },
    { variant: "mega", expected: "Mega Buffoon Pack" },
  ])("display name for $variant is $expected", ({ variant, expected }) => {
    expect(
      packDisplayName({ pool: "buffoon", variant, options: [] }),
    ).toBe(expected);
  });

  test("rollPackOptions returns joker options for buffoon", () => {
    const opts = rollPackOptions({
      pool: "buffoon",
      variant: "normal",
      planetCatalog: createPlanetCatalog(),
      tarotCatalog: createTarotCatalog(),
      jokerCatalog: createJokerCatalog(),
      spectralCatalog: createSpectralCatalog(),
      rng: seededRng(40),
    });
    expect(opts.every((o) => o.kind === "joker")).toBe(true);
  });

  test.each<{ variant: "normal" | "jumbo" | "mega"; length: number; rngSeed: number }>([
    { variant: "normal", length: 2, rngSeed: 41 },
    { variant: "jumbo", length: 4, rngSeed: 42 },
    { variant: "mega", length: 4, rngSeed: 43 },
  ])("$variant returns $length joker options", ({ variant, length, rngSeed }) => {
    const opts = rollPackOptions({
      pool: "buffoon",
      variant,
      planetCatalog: createPlanetCatalog(),
      tarotCatalog: createTarotCatalog(),
      jokerCatalog: createJokerCatalog(),
      spectralCatalog: createSpectralCatalog(),
      rng: seededRng(rngSeed),
    });
    expect(opts).toHaveLength(length);
  });

  test("excludes already-owned jokers from the option roll", () => {
    const catalog = createJokerCatalog();
    const ownedIds = catalog.slice(0, 5).map((j) => j.id);
    const opts = rollPackOptions({
      pool: "buffoon",
      variant: "jumbo",
      planetCatalog: createPlanetCatalog(),
      tarotCatalog: createTarotCatalog(),
      jokerCatalog: catalog,
      spectralCatalog: createSpectralCatalog(),
      excludedJokerIds: ownedIds,
      rng: seededRng(44),
    });
    const seen = opts.map((o) => (o.kind === "joker" ? o.joker.id : ""));
    const overlap = seen.filter((id) => ownedIds.includes(id));
    expect(overlap).toEqual([]);
  });

  test("returned joker ids are unique within a pack", () => {
    const opts = rollPackOptions({
      pool: "buffoon",
      variant: "mega",
      planetCatalog: createPlanetCatalog(),
      tarotCatalog: createTarotCatalog(),
      jokerCatalog: createJokerCatalog(),
      spectralCatalog: createSpectralCatalog(),
      rng: seededRng(45),
    });
    const ids = new Set(opts.map((o) => (o.kind === "joker" ? o.joker.id : "")));
    expect(ids.size).toBe(opts.length);
  });

  test("returns at most the eligible-pool size when many jokers are excluded", () => {
    const catalog = createJokerCatalog();
    const ownedIds = catalog.slice(0, catalog.length - 1).map((j) => j.id);
    const opts = rollPackOptions({
      pool: "buffoon",
      variant: "jumbo",
      planetCatalog: createPlanetCatalog(),
      tarotCatalog: createTarotCatalog(),
      jokerCatalog: catalog,
      spectralCatalog: createSpectralCatalog(),
      excludedJokerIds: ownedIds,
      rng: seededRng(46),
    });
    expect(opts).toHaveLength(1);
  });
});

describe("Spectral pack", () => {
  test.each<{ variant: "normal" | "jumbo" | "mega"; count: number }>([
    { variant: "normal", count: 2 },
    { variant: "jumbo", count: 4 },
    { variant: "mega", count: 4 },
  ])("$variant has $count options", ({ variant, count }) => {
    expect(packOptionsCount("spectral", variant)).toBe(count);
  });

  test.each<{ variant: "normal" | "jumbo" | "mega"; expected: string }>([
    { variant: "normal", expected: "Spectral Pack" },
    { variant: "jumbo", expected: "Jumbo Spectral Pack" },
    { variant: "mega", expected: "Mega Spectral Pack" },
  ])("display name for $variant is $expected", ({ variant, expected }) => {
    expect(
      packDisplayName({ pool: "spectral", variant, options: [] }),
    ).toBe(expected);
  });

  test("rollPackOptions returns spectral options for spectral pool", () => {
    const opts = rollPackOptions({
      pool: "spectral",
      variant: "normal",
      planetCatalog: createPlanetCatalog(),
      tarotCatalog: createTarotCatalog(),
      jokerCatalog: createJokerCatalog(),
      spectralCatalog: createSpectralCatalog(),
      rng: seededRng(50),
    });
    expect(opts.every((o) => o.kind === "spectral")).toBe(true);
  });

  test.each<{ variant: "normal" | "jumbo" | "mega"; length: number; rngSeed: number }>([
    { variant: "normal", length: 2, rngSeed: 51 },
    { variant: "jumbo", length: 4, rngSeed: 52 },
    { variant: "mega", length: 4, rngSeed: 53 },
  ])("$variant returns $length spectral options", ({ variant, length, rngSeed }) => {
    const opts = rollPackOptions({
      pool: "spectral",
      variant,
      planetCatalog: createPlanetCatalog(),
      tarotCatalog: createTarotCatalog(),
      jokerCatalog: createJokerCatalog(),
      spectralCatalog: createSpectralCatalog(),
      rng: seededRng(rngSeed),
    });
    expect(opts).toHaveLength(length);
  });

  test("returned spectral ids are unique within a pack", () => {
    const opts = rollPackOptions({
      pool: "spectral",
      variant: "mega",
      planetCatalog: createPlanetCatalog(),
      tarotCatalog: createTarotCatalog(),
      jokerCatalog: createJokerCatalog(),
      spectralCatalog: createSpectralCatalog(),
      rng: seededRng(54),
    });
    const ids = new Set(
      opts.map((o) => (o.kind === "spectral" ? o.spectral.id : "")),
    );
    expect(ids.size).toBe(opts.length);
  });

  test("spectral is the rarest pool under uniform RNG", () => {
    const counts: Record<string, number> = {
      celestial: 0,
      arcana: 0,
      buffoon: 0,
      spectral: 0,
    };
    const rng = seededRng(102);
    for (let i = 0; i < 2000; i += 1) {
      const offer = rollPack({
        planetCatalog: createPlanetCatalog(),
        tarotCatalog: createTarotCatalog(),
        jokerCatalog: createJokerCatalog(),
        spectralCatalog: createSpectralCatalog(),
        rng,
      });
      counts[offer.pool] += 1;
    }
    expect(counts.spectral).toBeLessThan(counts.buffoon);
  });
});

describe("Standard pack", () => {
  test.each<{ variant: "normal" | "jumbo" | "mega"; count: number }>([
    { variant: "normal", count: 3 },
    { variant: "jumbo", count: 5 },
    { variant: "mega", count: 5 },
  ])("$variant has $count options", ({ variant, count }) => {
    expect(packOptionsCount("standard", variant)).toBe(count);
  });

  test.each<{ variant: "normal" | "jumbo" | "mega"; expected: string }>([
    { variant: "normal", expected: "Standard Pack" },
    { variant: "jumbo", expected: "Jumbo Standard Pack" },
    { variant: "mega", expected: "Mega Standard Pack" },
  ])("display name for $variant is $expected", ({ variant, expected }) => {
    expect(
      packDisplayName({ pool: "standard", variant, options: [] }),
    ).toBe(expected);
  });

  test("rollPackOptions returns playing-card options for standard pool", () => {
    const opts = rollPackOptions({
      pool: "standard",
      variant: "normal",
      planetCatalog: createPlanetCatalog(),
      tarotCatalog: createTarotCatalog(),
      jokerCatalog: createJokerCatalog(),
      spectralCatalog: createSpectralCatalog(),
      rng: seededRng(60),
    });
    expect(opts.every((o) => o.kind === "playing-card")).toBe(true);
  });

  test.each<{ variant: "normal" | "jumbo" | "mega"; length: number; rngSeed: number }>([
    { variant: "normal", length: 3, rngSeed: 61 },
    { variant: "jumbo", length: 5, rngSeed: 62 },
    { variant: "mega", length: 5, rngSeed: 63 },
  ])("$variant returns $length playing-card options", ({ variant, length, rngSeed }) => {
    const opts = rollPackOptions({
      pool: "standard",
      variant,
      planetCatalog: createPlanetCatalog(),
      tarotCatalog: createTarotCatalog(),
      jokerCatalog: createJokerCatalog(),
      spectralCatalog: createSpectralCatalog(),
      rng: seededRng(rngSeed),
    });
    expect(opts).toHaveLength(length);
  });

  test("every Standard option has a valid rank", () => {
    const opts = rollPackOptions({
      pool: "standard",
      variant: "mega",
      planetCatalog: createPlanetCatalog(),
      tarotCatalog: createTarotCatalog(),
      jokerCatalog: createJokerCatalog(),
      spectralCatalog: createSpectralCatalog(),
      rng: seededRng(64),
    });
    const validRanks = new Set<string>(RANKS);
    expect(
      opts.every(
        (o) => o.kind === "playing-card" && validRanks.has(o.card.rank),
      ),
    ).toBe(true);
  });

  test("every Standard option has a valid suit", () => {
    const opts = rollPackOptions({
      pool: "standard",
      variant: "mega",
      planetCatalog: createPlanetCatalog(),
      tarotCatalog: createTarotCatalog(),
      jokerCatalog: createJokerCatalog(),
      spectralCatalog: createSpectralCatalog(),
      rng: seededRng(65),
    });
    const validSuits = new Set<string>(SUITS);
    expect(
      opts.every(
        (o) => o.kind === "playing-card" && validSuits.has(o.card.suit),
      ),
    ).toBe(true);
  });

  test("rollStandardCard never produces a Stone enhancement", () => {
    const rng = seededRng(66);
    let stoneCount = 0;
    for (let i = 0; i < 2000; i += 1) {
      const c = rollStandardCard(rng);
      if (c.enhancement === "stone") stoneCount += 1;
    }
    expect(stoneCount).toBe(0);
  });

  test("rollStandardCard produces some cards with no enhancement (most cards un-enhanced)", () => {
    const rng = seededRng(67);
    let plain = 0;
    for (let i = 0; i < 1000; i += 1) {
      const c = rollStandardCard(rng);
      if (c.enhancement === undefined) plain += 1;
    }
    expect(plain).toBeGreaterThan(400);
  });

  test("rollStandardCard produces some cards with an enhancement", () => {
    const rng = seededRng(68);
    let enhanced = 0;
    for (let i = 0; i < 1000; i += 1) {
      const c = rollStandardCard(rng);
      if (c.enhancement !== undefined) enhanced += 1;
    }
    expect(enhanced).toBeGreaterThan(0);
  });

  test("rollStandardCard produces some cards with a seal", () => {
    const rng = seededRng(69);
    let sealed = 0;
    for (let i = 0; i < 1000; i += 1) {
      const c = rollStandardCard(rng);
      if (c.seal !== undefined) sealed += 1;
    }
    expect(sealed).toBeGreaterThan(0);
  });

  test("rollStandardCard usually leaves a card un-sealed", () => {
    const rng = seededRng(70);
    let unsealed = 0;
    for (let i = 0; i < 1000; i += 1) {
      const c = rollStandardCard(rng);
      if (c.seal === undefined) unsealed += 1;
    }
    expect(unsealed).toBeGreaterThan(600);
  });

  test("rollStandardCard gives every card a unique id", () => {
    const rng = seededRng(71);
    const ids = new Set<number>();
    for (let i = 0; i < 50; i += 1) {
      ids.add(rollStandardCard(rng).id);
    }
    expect(ids.size).toBe(50);
  });

  test("force100 override always assigns both an enhancement and a seal (#354)", () => {
    chanceOverrideConfig.force100 = true;
    try {
      const rng = seededRng(72);
      const card = rollStandardCard(rng);
      expect(card.enhancement).not.toBeUndefined();
      expect(card.seal).not.toBeUndefined();
    } finally {
      chanceOverrideConfig.force100 = false;
    }
  });
});

describe("rollPackForPool", () => {
  function rollArgs(seed: number) {
    return {
      planetCatalog: createPlanetCatalog(),
      tarotCatalog: createTarotCatalog(),
      jokerCatalog: createJokerCatalog(),
      spectralCatalog: createSpectralCatalog(),
      rng: seededRng(seed),
    };
  }

  test("returns an offer with the requested pool", () => {
    expect(rollPackForPool("arcana", rollArgs(80)).pool).toBe("arcana");
  });

  test("returns a normal variant regardless of pool", () => {
    expect(rollPackForPool("spectral", rollArgs(81)).variant).toBe("normal");
  });

  test("returns the normal option count for the chosen pool", () => {
    const offer = rollPackForPool("celestial", rollArgs(82));
    expect(offer.options.length).toBe(packOptionsCount("celestial", "normal"));
  });

  test("standard pool yields playing-card options", () => {
    const offer = rollPackForPool("standard", rollArgs(83));
    expect(offer.options.every((o) => o.kind === "playing-card")).toBe(true);
  });

  test("honors an explicit variant", () => {
    expect(rollPackForPool("arcana", rollArgs(84), "mega").variant).toBe("mega");
  });

  test("a mega pack yields the mega option count", () => {
    const offer = rollPackForPool("arcana", rollArgs(85), "mega");
    expect(offer.options.length).toBe(packOptionsCount("arcana", "mega"));
  });

  test("honors the forced-variant dev flag when no explicit variant is passed", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) =>
          key === "browslatro:forcePackVariant" ? "mega" : null,
      },
    });
    try {
      expect(rollPackForPool("arcana", rollArgs(86)).variant).toBe("mega");
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("Spectral pool excludes hidden spectrals (closes #826)", () => {
  function countSpectralIdsAcrossRolls(seed: number, rolls: number): Map<string, number> {
    const counts = new Map<string, number>();
    const rng = seededRng(seed);
    const spectralCatalog = createSpectralCatalog();
    for (let i = 0; i < rolls; i += 1) {
      const opts = rollPackOptions({
        pool: "spectral",
        variant: "mega",
        planetCatalog: createPlanetCatalog(),
        tarotCatalog: createTarotCatalog(),
        jokerCatalog: createJokerCatalog(),
        spectralCatalog,
        rng,
      });
      for (const o of opts) {
        if (o.kind !== "spectral") continue;
        counts.set(o.spectral.id, (counts.get(o.spectral.id) ?? 0) + 1);
      }
    }
    return counts;
  }

  test("Black Hole frequency is below 1% over 2,000 spectral slots (seeded)", () => {
    const counts = countSpectralIdsAcrossRolls(101, 400);
    const blackHole = counts.get("black-hole") ?? 0;
    const total = Array.from(counts.values()).reduce((s, n) => s + n, 0);
    expect(blackHole / total).toBeLessThan(0.01);
  });

  test("The Soul frequency is below 1% over 2,000 spectral slots (seeded)", () => {
    const counts = countSpectralIdsAcrossRolls(102, 400);
    const soul = counts.get("soul") ?? 0;
    const total = Array.from(counts.values()).reduce((s, n) => s + n, 0);
    expect(soul / total).toBeLessThan(0.01);
  });

  test("pool spectrals each appear roughly 1/16 of the time (seeded)", () => {
    const counts = countSpectralIdsAcrossRolls(103, 800);
    const poolIds = createSpectralCatalog()
      .filter((s) => !s.hidden)
      .map((s) => s.id);
    const total = Array.from(counts.values()).reduce((s, n) => s + n, 0);
    const poolMin = Math.min(...poolIds.map((id) => counts.get(id) ?? 0));
    expect(poolMin / total).toBeGreaterThan(0.03);
  });

  test("spectral pool draw never returns Black Hole when replacement rolls miss (negative)", () => {
    const rng = sequenceRng([0.5]);
    const opts = rollPackOptions({
      pool: "spectral",
      variant: "mega",
      planetCatalog: createPlanetCatalog(),
      tarotCatalog: createTarotCatalog(),
      jokerCatalog: createJokerCatalog(),
      spectralCatalog: createSpectralCatalog(),
      rng,
    });
    const ids = opts.flatMap((o) => (o.kind === "spectral" ? [o.spectral.id] : []));
    expect(ids).not.toContain("black-hole");
  });

  test("spectral pool draw never returns The Soul when replacement rolls miss (negative)", () => {
    const rng = sequenceRng([0.5]);
    const opts = rollPackOptions({
      pool: "spectral",
      variant: "mega",
      planetCatalog: createPlanetCatalog(),
      tarotCatalog: createTarotCatalog(),
      jokerCatalog: createJokerCatalog(),
      spectralCatalog: createSpectralCatalog(),
      rng,
    });
    const ids = opts.flatMap((o) => (o.kind === "spectral" ? [o.spectral.id] : []));
    expect(ids).not.toContain("soul");
  });
});

describe("Hidden-spectral replacement in packs (closes #826)", () => {
  test("Arcana slot is replaced by Black Hole when the slot roll lands under 0.3%", () => {
    const rng = sequenceRng([0.001, 0.5, 0.5]);
    const opts = rollPackOptions({
      pool: "arcana",
      variant: "normal",
      planetCatalog: createPlanetCatalog(),
      tarotCatalog: createTarotCatalog(),
      jokerCatalog: createJokerCatalog(),
      spectralCatalog: createSpectralCatalog(),
      rng,
    });
    expect(opts[0]).toEqual({
      kind: "spectral",
      spectral: expect.objectContaining({ id: "black-hole" }),
    });
  });

  test("Arcana slot is replaced by The Soul when the roll lands in the 0.3-0.6% slice", () => {
    const rng = sequenceRng([0.004, 0.5, 0.5]);
    const opts = rollPackOptions({
      pool: "arcana",
      variant: "normal",
      planetCatalog: createPlanetCatalog(),
      tarotCatalog: createTarotCatalog(),
      jokerCatalog: createJokerCatalog(),
      spectralCatalog: createSpectralCatalog(),
      rng,
    });
    expect(opts[0]).toEqual({
      kind: "spectral",
      spectral: expect.objectContaining({ id: "soul" }),
    });
  });

  test("Spectral slot is replaced by Black Hole even though the pool pick was different", () => {
    const rng = sequenceRng([0.001, 0.5]);
    const opts = rollPackOptions({
      pool: "spectral",
      variant: "normal",
      planetCatalog: createPlanetCatalog(),
      tarotCatalog: createTarotCatalog(),
      jokerCatalog: createJokerCatalog(),
      spectralCatalog: createSpectralCatalog(),
      rng,
    });
    expect(opts[0]).toEqual({
      kind: "spectral",
      spectral: expect.objectContaining({ id: "black-hole" }),
    });
  });

  test("Arcana slot remains a Tarot when the replacement roll misses (negative)", () => {
    const rng = sequenceRng([0.5]);
    const opts = rollPackOptions({
      pool: "arcana",
      variant: "normal",
      planetCatalog: createPlanetCatalog(),
      tarotCatalog: createTarotCatalog(),
      jokerCatalog: createJokerCatalog(),
      spectralCatalog: createSpectralCatalog(),
      rng,
    });
    expect(opts.every((o) => o.kind === "tarot")).toBe(true);
  });

  test("rng consumption for an arcana pack matches the slot count (single rng per slot)", () => {
    let calls = 0;
    const rng = (): number => {
      calls += 1;
      return 0.5;
    };
    rollPackOptions({
      pool: "arcana",
      variant: "normal",
      planetCatalog: createPlanetCatalog(),
      tarotCatalog: createTarotCatalog(),
      jokerCatalog: createJokerCatalog(),
      spectralCatalog: createSpectralCatalog(),
      rng,
    });
    expect(calls).toBe(3);
  });
});
