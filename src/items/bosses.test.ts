import {
  DEFAULT_STARTING_DISCARDS,
  DEFAULT_STARTING_HANDS,
  availableBosses,
  bossHandSize,
  bossMoneyPenaltyPerCard,
  bossRequiredCardCount,
  bossStartingDiscards,
  bossStartingHands,
  createBossCatalog,
  debuffedHandIds,
  isCardDebuffedByBoss,
  pickBossForAnte,
  type BossBlind,
} from "./bosses";
import type { Card } from "../cards/types";

describe("createBossCatalog", () => {
  test("includes the default Boss Blind entry", () => {
    expect(createBossCatalog().some((b) => b.id === "boss-default")).toBe(true);
  });

  test("includes The Wall entry", () => {
    expect(createBossCatalog().some((b) => b.id === "the-wall")).toBe(true);
  });

  test("returns a fresh copy each call", () => {
    expect(createBossCatalog()).not.toBe(createBossCatalog());
  });
});

describe("availableBosses — ante gating", () => {
  test("ante 1 excludes The Wall (anteMin=2)", () => {
    const ids = availableBosses(createBossCatalog(), 1).map((b) => b.id);
    expect(ids).not.toContain("the-wall");
  });

  test("ante 1 includes boss-default", () => {
    const ids = availableBosses(createBossCatalog(), 1).map((b) => b.id);
    expect(ids).toContain("boss-default");
  });

  test("ante 2 includes The Wall", () => {
    const ids = availableBosses(createBossCatalog(), 2).map((b) => b.id);
    expect(ids).toContain("the-wall");
  });
});

describe("pickBossForAnte", () => {
  test("with rng=0 returns the first eligible boss for ante 1 (boss-default)", () => {
    expect(pickBossForAnte({ ante: 1, rng: () => 0 }).id).toBe("boss-default");
  });

  test("uses the provided rng deterministically", () => {
    const catalog: ReadonlyArray<BossBlind> = [
      { id: "a", name: "A", description: "", scoreMultiplier: 2, anteMin: 1, effect: { kind: "none" } },
      { id: "b", name: "B", description: "", scoreMultiplier: 2, anteMin: 1, effect: { kind: "none" } },
    ];
    expect(
      pickBossForAnte({ ante: 1, catalog, rng: () => 0 }).id,
    ).toBe("a");
  });

  test("indexes by rng across the eligible pool", () => {
    const catalog: ReadonlyArray<BossBlind> = [
      { id: "a", name: "A", description: "", scoreMultiplier: 2, anteMin: 1, effect: { kind: "none" } },
      { id: "b", name: "B", description: "", scoreMultiplier: 2, anteMin: 1, effect: { kind: "none" } },
    ];
    expect(
      pickBossForAnte({ ante: 1, catalog, rng: () => 0.6 }).id,
    ).toBe("b");
  });

  test("prefers fresh bosses over recent ones when alternatives exist", () => {
    const catalog: ReadonlyArray<BossBlind> = [
      { id: "a", name: "A", description: "", scoreMultiplier: 2, anteMin: 1, effect: { kind: "none" } },
      { id: "b", name: "B", description: "", scoreMultiplier: 2, anteMin: 1, effect: { kind: "none" } },
    ];
    expect(
      pickBossForAnte({
        ante: 1,
        catalog,
        recentIds: new Set(["a"]),
        rng: () => 0,
      }).id,
    ).toBe("b");
  });

  test("falls back to recent bosses when no fresh ones are eligible", () => {
    const catalog: ReadonlyArray<BossBlind> = [
      { id: "a", name: "A", description: "", scoreMultiplier: 2, anteMin: 1, effect: { kind: "none" } },
    ];
    expect(
      pickBossForAnte({
        ante: 1,
        catalog,
        recentIds: new Set(["a"]),
        rng: () => 0,
      }).id,
    ).toBe("a");
  });

  test("throws when no boss is available for the requested ante", () => {
    const catalog: ReadonlyArray<BossBlind> = [
      { id: "late", name: "Late", description: "", scoreMultiplier: 2, anteMin: 5, effect: { kind: "none" } },
    ];
    expect(() => pickBossForAnte({ ante: 1, catalog })).toThrow();
  });
});

describe("Phase 1 boss catalog entries (#245)", () => {
  test.each([
    ["the-needle", { kind: "start-with-hands", value: 1 }],
    ["the-water", { kind: "start-with-discards", value: 0 }],
    ["the-manacle", { kind: "hand-size-delta", value: -1 }],
    ["the-psychic", { kind: "force-card-count", value: 5 }],
    ["the-tooth", { kind: "money-per-card-played", value: 1 }],
  ] as const)("%s has the expected effect", (id, expectedEffect) => {
    const boss = createBossCatalog().find((b) => b.id === id);
    expect(boss?.effect).toEqual(expectedEffect);
  });

  test("the-tooth requires ante 3+", () => {
    expect(
      createBossCatalog().find((b) => b.id === "the-tooth")?.anteMin,
    ).toBe(3);
  });
});

describe("bossStartingHands", () => {
  test("returns the boss's value for the-needle", () => {
    const needle = createBossCatalog().find((b) => b.id === "the-needle")!;
    expect(bossStartingHands(needle)).toBe(1);
  });

  test("returns the default for a non-handsstarting boss", () => {
    const wall = createBossCatalog().find((b) => b.id === "the-wall")!;
    expect(bossStartingHands(wall)).toBe(DEFAULT_STARTING_HANDS);
  });

  test("returns the default when boss is null", () => {
    expect(bossStartingHands(null)).toBe(DEFAULT_STARTING_HANDS);
  });
});

describe("bossStartingDiscards", () => {
  test("returns 0 for the-water", () => {
    const water = createBossCatalog().find((b) => b.id === "the-water")!;
    expect(bossStartingDiscards(water)).toBe(0);
  });

  test("returns the default for a non-discards boss", () => {
    expect(bossStartingDiscards(null)).toBe(DEFAULT_STARTING_DISCARDS);
  });
});

describe("bossHandSize", () => {
  test("subtracts 1 from the base for the-manacle", () => {
    const manacle = createBossCatalog().find((b) => b.id === "the-manacle")!;
    expect(bossHandSize(manacle, 8)).toBe(7);
  });

  test("returns the base size when boss has no hand-size effect", () => {
    const wall = createBossCatalog().find((b) => b.id === "the-wall")!;
    expect(bossHandSize(wall, 8)).toBe(8);
  });

  test("floors at 1 when the delta would drop the size below 1", () => {
    const tinyHand: BossBlind = {
      id: "tiny",
      name: "Tiny",
      description: "",
      scoreMultiplier: 2,
      anteMin: 1,
      effect: { kind: "hand-size-delta", value: -50 },
    };
    expect(bossHandSize(tinyHand, 8)).toBe(1);
  });
});

describe("bossRequiredCardCount", () => {
  test("returns 5 for the-psychic", () => {
    const psychic = createBossCatalog().find((b) => b.id === "the-psychic")!;
    expect(bossRequiredCardCount(psychic)).toBe(5);
  });

  test("returns null for bosses without force-card-count", () => {
    expect(bossRequiredCardCount(null)).toBeNull();
  });
});

describe("bossMoneyPenaltyPerCard", () => {
  test("returns 1 for the-tooth", () => {
    const tooth = createBossCatalog().find((b) => b.id === "the-tooth")!;
    expect(bossMoneyPenaltyPerCard(tooth)).toBe(1);
  });

  test("returns 0 for bosses without money-per-card-played", () => {
    expect(bossMoneyPenaltyPerCard(null)).toBe(0);
  });
});

describe("Phase 2 debuff catalog entries (#245)", () => {
  test.each([
    ["the-club", "clubs"],
    ["the-goad", "spades"],
    ["the-window", "diamonds"],
    ["the-head", "hearts"],
  ] as const)("%s debuffs %s", (id, suit) => {
    const boss = createBossCatalog().find((b) => b.id === id);
    expect(boss?.effect).toEqual({ kind: "debuff-suit", suit });
  });

  test("the-plant debuffs face cards", () => {
    expect(
      createBossCatalog().find((b) => b.id === "the-plant")?.effect,
    ).toEqual({ kind: "debuff-face" });
  });

  test("the-plant requires ante 4+", () => {
    expect(
      createBossCatalog().find((b) => b.id === "the-plant")?.anteMin,
    ).toBe(4);
  });
});

describe("isCardDebuffedByBoss", () => {
  const club: Card = { id: 1, rank: "5", suit: "clubs" };
  const heart: Card = { id: 2, rank: "Q", suit: "hearts" };
  const spadeTwo: Card = { id: 3, rank: "2", suit: "spades" };

  test("returns false when boss is null", () => {
    expect(isCardDebuffedByBoss(null, club)).toBe(false);
  });

  test("debuffs a club card under The Club", () => {
    const boss = createBossCatalog().find((b) => b.id === "the-club")!;
    expect(isCardDebuffedByBoss(boss, club)).toBe(true);
  });

  test("does not debuff a non-club card under The Club", () => {
    const boss = createBossCatalog().find((b) => b.id === "the-club")!;
    expect(isCardDebuffedByBoss(boss, spadeTwo)).toBe(false);
  });

  test("debuffs a face card under The Plant", () => {
    const boss = createBossCatalog().find((b) => b.id === "the-plant")!;
    expect(isCardDebuffedByBoss(boss, heart)).toBe(true);
  });

  test("does not debuff a non-face card under The Plant", () => {
    const boss = createBossCatalog().find((b) => b.id === "the-plant")!;
    expect(isCardDebuffedByBoss(boss, spadeTwo)).toBe(false);
  });

  test("returns false for non-debuff bosses (The Wall)", () => {
    const boss = createBossCatalog().find((b) => b.id === "the-wall")!;
    expect(isCardDebuffedByBoss(boss, heart)).toBe(false);
  });
});

describe("debuffedHandIds", () => {
  const hand: ReadonlyArray<Card> = [
    { id: 10, rank: "5", suit: "clubs" },
    { id: 11, rank: "5", suit: "hearts" },
    { id: 12, rank: "K", suit: "spades" },
  ];

  test("returns empty set when isBossRound is false", () => {
    const boss = createBossCatalog().find((b) => b.id === "the-club")!;
    expect(debuffedHandIds(hand, boss, false).size).toBe(0);
  });

  test("returns empty set when boss is null", () => {
    expect(debuffedHandIds(hand, null, true).size).toBe(0);
  });

  test("returns the ids of debuffed cards under The Club", () => {
    const boss = createBossCatalog().find((b) => b.id === "the-club")!;
    expect(Array.from(debuffedHandIds(hand, boss, true))).toEqual([10]);
  });

  test("returns the face-card ids under The Plant", () => {
    const boss = createBossCatalog().find((b) => b.id === "the-plant")!;
    expect(Array.from(debuffedHandIds(hand, boss, true))).toEqual([12]);
  });
});
