// @vitest-environment node
import { HANDS } from "./constants";
import type { HandLabel } from "./handEvaluator";
import { createDefaultHandStats } from "./handStats";
import {
  PLANET_BASE_PRICE,
  applyPlanetUpgrade,
  availablePlanets,
  createPlanetCatalog,
  type PlanetCard,
} from "./planets";

type HandPlayCounts = Readonly<Record<HandLabel, number>>;

function emptyCounts(): HandPlayCounts {
  const counts = {} as Record<HandLabel, number>;
  for (const hand of HANDS) {
    counts[hand.label as HandLabel] = 0;
  }
  return counts;
}

function countsWith(overrides: Partial<Record<HandLabel, number>>): HandPlayCounts {
  return { ...emptyCounts(), ...overrides };
}

function planetById(id: string): PlanetCard {
  const found = createPlanetCatalog().find((p) => p.id === id);
  if (!found) throw new Error(`No planet with id ${id}`);
  return found;
}

describe("PLANET_BASE_PRICE", () => {
  test("is three dollars", () => {
    expect(PLANET_BASE_PRICE).toBe(3);
  });
});

describe("createPlanetCatalog", () => {
  test("contains one planet per hand-type entry from the wiki table", () => {
    expect(createPlanetCatalog()).toHaveLength(12);
  });

  test("has unique ids", () => {
    const ids = createPlanetCatalog().map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("references only valid HandLabel values", () => {
    const validLabels = new Set<string>(HANDS.map((h) => h.label));
    const allValid = createPlanetCatalog()
      .flatMap((p) => p.hands)
      .every((h) => validLabels.has(h));
    expect(allValid).toBe(true);
  });

  test("every planet has a non-empty description", () => {
    const allDescribed = createPlanetCatalog().every(
      (p) => p.description.length > 0,
    );
    expect(allDescribed).toBe(true);
  });
});

describe("planet → hand mapping (Balatro table)", () => {
  const cases: ReadonlyArray<{
    id: string;
    hand: HandLabel;
    chips: number;
    mult: number;
  }> = [
    { id: "pluto", hand: "High Card", chips: 10, mult: 1 },
    { id: "mercury", hand: "Pair", chips: 15, mult: 1 },
    { id: "uranus", hand: "Two Pair", chips: 20, mult: 1 },
    { id: "venus", hand: "Three of a Kind", chips: 20, mult: 2 },
    { id: "saturn", hand: "Straight", chips: 30, mult: 3 },
    { id: "jupiter", hand: "Flush", chips: 15, mult: 2 },
    { id: "earth", hand: "Full House", chips: 25, mult: 2 },
    { id: "mars", hand: "Four of a Kind", chips: 30, mult: 3 },
    { id: "planet-x", hand: "Five of a Kind", chips: 35, mult: 3 },
    { id: "ceres", hand: "Flush House", chips: 40, mult: 4 },
    { id: "eris", hand: "Flush Five", chips: 50, mult: 3 },
  ];

  test.each(cases)(
    "$id applies +$chips chips and +$mult mult to $hand",
    ({ id, hand, chips, mult }) => {
      const planet = planetById(id);
      expect(planet.hands).toContain(hand);
      expect(planet.chipsDelta).toBe(chips);
      expect(planet.multDelta).toBe(mult);
    },
  );

  test("Neptune upgrades both Straight Flush and Royal Flush", () => {
    expect(planetById("neptune").hands).toEqual([
      "Straight Flush",
      "Royal Flush",
    ]);
  });

  test("Neptune carries +40 chips / +4 mult", () => {
    const neptune = planetById("neptune");
    expect(neptune.chipsDelta).toBe(40);
    expect(neptune.multDelta).toBe(4);
  });
});

describe("applyPlanetUpgrade", () => {
  test("adds chipsDelta to the matching hand entry", () => {
    const before = createDefaultHandStats();
    const after = applyPlanetUpgrade(before, planetById("pluto"));
    expect(after["High Card"].chips).toBe(before["High Card"].chips + 10);
  });

  test("adds multDelta to the matching hand entry", () => {
    const before = createDefaultHandStats();
    const after = applyPlanetUpgrade(before, planetById("pluto"));
    expect(after["High Card"].multiplier).toBe(
      before["High Card"].multiplier + 1,
    );
  });

  test("leaves unrelated hand entries untouched", () => {
    const before = createDefaultHandStats();
    const after = applyPlanetUpgrade(before, planetById("pluto"));
    expect(after.Pair).toEqual(before.Pair);
  });

  test("Neptune upgrades both Straight Flush and Royal Flush at once", () => {
    const before = createDefaultHandStats();
    const after = applyPlanetUpgrade(before, planetById("neptune"));
    expect(after["Straight Flush"].chips).toBe(
      before["Straight Flush"].chips + 40,
    );
    expect(after["Royal Flush"].chips).toBe(before["Royal Flush"].chips + 40);
  });

  test("stacks additively when applied twice", () => {
    const before = createDefaultHandStats();
    const once = applyPlanetUpgrade(before, planetById("pluto"));
    const twice = applyPlanetUpgrade(once, planetById("pluto"));
    expect(twice["High Card"].chips).toBe(before["High Card"].chips + 20);
    expect(twice["High Card"].multiplier).toBe(
      before["High Card"].multiplier + 2,
    );
  });

  test("increments the level of the matching hand by 1", () => {
    const before = createDefaultHandStats();
    const after = applyPlanetUpgrade(before, planetById("pluto"));
    expect(after["High Card"].level).toBe(before["High Card"].level + 1);
  });

  test("leaves unrelated hand levels untouched", () => {
    const before = createDefaultHandStats();
    const after = applyPlanetUpgrade(before, planetById("pluto"));
    expect(after.Pair.level).toBe(before.Pair.level);
  });

  test("Neptune increments level on both Straight Flush and Royal Flush", () => {
    const before = createDefaultHandStats();
    const after = applyPlanetUpgrade(before, planetById("neptune"));
    expect(after["Straight Flush"].level).toBe(
      before["Straight Flush"].level + 1,
    );
    expect(after["Royal Flush"].level).toBe(before["Royal Flush"].level + 1);
  });

  test("two applications of the same planet bring level to 3", () => {
    const before = createDefaultHandStats();
    const twice = applyPlanetUpgrade(
      applyPlanetUpgrade(before, planetById("pluto")),
      planetById("pluto"),
    );
    expect(twice["High Card"].level).toBe(3);
  });

  test("does not mutate the input stats object", () => {
    const before = createDefaultHandStats();
    const snapshot = before["High Card"];
    applyPlanetUpgrade(before, planetById("pluto"));
    expect(before["High Card"]).toEqual(snapshot);
  });
});

describe("secret-hand planet metadata", () => {
  test("Planet X is gated by Five of a Kind", () => {
    expect(planetById("planet-x").hiddenUntilPlayed).toBe("Five of a Kind");
  });

  test("Ceres is gated by Flush House", () => {
    expect(planetById("ceres").hiddenUntilPlayed).toBe("Flush House");
  });

  test("Eris is gated by Flush Five", () => {
    expect(planetById("eris").hiddenUntilPlayed).toBe("Flush Five");
  });

  test("Neptune is not gated", () => {
    expect(planetById("neptune").hiddenUntilPlayed).toBeUndefined();
  });

  test("all non-secret planets have no hiddenUntilPlayed", () => {
    const nonSecret = createPlanetCatalog().filter(
      (p) => !["planet-x", "ceres", "eris"].includes(p.id),
    );
    expect(nonSecret.every((p) => p.hiddenUntilPlayed === undefined)).toBe(true);
  });
});

describe("availablePlanets", () => {
  test("hides Planet X, Ceres, and Eris on a fresh run", () => {
    const ids = availablePlanets(createPlanetCatalog(), emptyCounts()).map((p) => p.id);
    expect(ids).not.toEqual(expect.arrayContaining(["planet-x", "ceres", "eris"]));
  });

  test("keeps all nine non-secret planets on a fresh run", () => {
    const result = availablePlanets(createPlanetCatalog(), emptyCounts());
    expect(result).toHaveLength(9);
  });

  test("unlocks Planet X after Five of a Kind is played", () => {
    const ids = availablePlanets(
      createPlanetCatalog(),
      countsWith({ "Five of a Kind": 1 }),
    ).map((p) => p.id);
    expect(ids).toContain("planet-x");
  });

  test("unlocking Five of a Kind does not unlock Ceres or Eris", () => {
    const ids = availablePlanets(
      createPlanetCatalog(),
      countsWith({ "Five of a Kind": 1 }),
    ).map((p) => p.id);
    expect(ids).not.toContain("ceres");
    expect(ids).not.toContain("eris");
  });

  test("unlocks Ceres after Flush House is played", () => {
    const ids = availablePlanets(
      createPlanetCatalog(),
      countsWith({ "Flush House": 1 }),
    ).map((p) => p.id);
    expect(ids).toContain("ceres");
  });

  test("unlocks Eris after Flush Five is played", () => {
    const ids = availablePlanets(
      createPlanetCatalog(),
      countsWith({ "Flush Five": 1 }),
    ).map((p) => p.id);
    expect(ids).toContain("eris");
  });

  test("returns the full catalog when all three secret hands are played", () => {
    const result = availablePlanets(
      createPlanetCatalog(),
      countsWith({
        "Five of a Kind": 1,
        "Flush House": 1,
        "Flush Five": 1,
      }),
    );
    expect(result).toHaveLength(12);
  });

  test("playing an unrelated hand does not unlock any secret planet", () => {
    const ids = availablePlanets(
      createPlanetCatalog(),
      countsWith({ Pair: 5, Flush: 3 }),
    ).map((p) => p.id);
    expect(ids).not.toContain("planet-x");
    expect(ids).not.toContain("ceres");
    expect(ids).not.toContain("eris");
  });
});
