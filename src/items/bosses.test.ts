import {
  DEFAULT_STARTING_DISCARDS,
  DEFAULT_STARTING_HANDS,
  applyBossFaceDown,
  availableBosses,
  bossAdjustHandEntry,
  bossHandSize,
  bossMoneyPenaltyPerCard,
  bossPostPlayDiscardCount,
  bossRefillCountOverride,
  bossRequiredCardCount,
  bossShouldZeroWallet,
  bossStartingDiscards,
  bossStartingHands,
  bossDisablesRandomJoker,
  bossHidesJokers,
  bossPoolForAnte,
  bossVoidReason,
  bossVoidsHandLabel,
  createBossCatalog,
  debuffedHandIds,
  isCardDebuffedByBoss,
  isShowdownAnte,
  pickBossForAnte,
  pickHookDiscardIds,
  type BossBlind,
} from "./bosses";
import type { Card } from "../cards/types";
import type { HandLabel } from "../scoring/handEvaluator";

describe("createBossCatalog", () => {
  test("does not include the abilityless generic boss-default entry", () => {
    expect(createBossCatalog().some((b) => b.id === "boss-default")).toBe(false);
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

  test("ante 1 includes The Manacle (anteMin=1)", () => {
    const ids = availableBosses(createBossCatalog(), 1).map((b) => b.id);
    expect(ids).toContain("the-manacle");
  });

  test("ante 2 includes The Wall", () => {
    const ids = availableBosses(createBossCatalog(), 2).map((b) => b.id);
    expect(ids).toContain("the-wall");
  });
});

describe("pickBossForAnte", () => {
  test("with rng=0 returns the first eligible boss for ante 1 (the-manacle)", () => {
    expect(pickBossForAnte({ ante: 1, rng: () => 0 }).id).toBe("the-manacle");
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

describe("Phase 1 boss catalog entries", () => {
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

describe("Phase 2 debuff catalog entries", () => {
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

describe("Phase 3 round-state catalog entries", () => {
  test.each([
    ["the-mouth", { kind: "single-hand-type" }, 2],
    ["the-eye", { kind: "no-repeat-hand-type" }, 3],
    ["the-pillar", { kind: "debuff-played-this-ante" }, 1],
    ["the-arm", { kind: "hand-level-delta", value: -1 }, 2],
    [
      "the-flint",
      { kind: "hand-stats-multiplier", chipsFactor: 0.5, multFactor: 0.5 },
      2,
    ],
  ] as const)("%s has the expected effect and anteMin", (id, effect, anteMin) => {
    const boss = createBossCatalog().find((b) => b.id === id);
    expect(boss?.effect).toEqual(effect);
    expect(boss?.anteMin).toBe(anteMin);
  });
});

describe("bossVoidsHandLabel", () => {
  const mouth = createBossCatalog().find((b) => b.id === "the-mouth")!;
  const eye = createBossCatalog().find((b) => b.id === "the-eye")!;
  const wall = createBossCatalog().find((b) => b.id === "the-wall")!;

  test("Mouth does not void the first played hand of any label", () => {
    expect(bossVoidsHandLabel(mouth, "Pair", [])).toBe(false);
  });

  test("Mouth voids a different label after the first play", () => {
    expect(bossVoidsHandLabel(mouth, "Flush", ["Pair"])).toBe(true);
  });

  test("Mouth does not void the same label after the first play", () => {
    expect(bossVoidsHandLabel(mouth, "Pair", ["Pair"])).toBe(false);
  });

  test("Eye voids a repeated label", () => {
    expect(bossVoidsHandLabel(eye, "Pair", ["Pair"])).toBe(true);
  });

  test("Eye does not void a fresh label after a different one was played", () => {
    expect(bossVoidsHandLabel(eye, "Flush", ["Pair"])).toBe(false);
  });

  test("Non-restriction bosses never void", () => {
    expect(bossVoidsHandLabel(wall, "Pair", ["Pair", "Pair"])).toBe(false);
  });

  test("null boss never voids", () => {
    expect(bossVoidsHandLabel(null, "Pair", ["Pair"])).toBe(false);
  });
});

describe("bossVoidReason", () => {
  const mouth = createBossCatalog().find((b) => b.id === "the-mouth")!;
  const eye = createBossCatalog().find((b) => b.id === "the-eye")!;
  const wall = createBossCatalog().find((b) => b.id === "the-wall")!;

  test("Mouth reports the locked hand from the first play", () => {
    expect(bossVoidReason(mouth, ["Pair"])).toEqual({
      kind: "mouth",
      lockedHand: "Pair",
    });
  });

  test("Mouth reports null before any hand is locked", () => {
    expect(bossVoidReason(mouth, [])).toBeNull();
  });

  test("Eye reports the eye reason", () => {
    expect(bossVoidReason(eye, ["Pair"])).toEqual({ kind: "eye" });
  });

  test("Non-restriction bosses report null", () => {
    expect(bossVoidReason(wall, ["Pair"])).toBeNull();
  });
});

describe("debuffedHandIds — The Pillar (debuff-played-this-ante)", () => {
  const pillar = createBossCatalog().find((b) => b.id === "the-pillar")!;
  const hand: ReadonlyArray<Card> = [
    { id: 100, rank: "5", suit: "clubs" },
    { id: 101, rank: "5", suit: "hearts" },
    { id: 102, rank: "7", suit: "spades" },
  ];

  test("debuffs cards whose key is in the ante-played set", () => {
    expect(
      Array.from(
        debuffedHandIds(hand, pillar, true, new Set(["5-clubs", "7-spades"])),
      ).sort(),
    ).toEqual([100, 102]);
  });

  test("returns an empty set when the ante set is empty", () => {
    expect(debuffedHandIds(hand, pillar, true, new Set()).size).toBe(0);
  });

  test("only applies on boss rounds", () => {
    expect(
      debuffedHandIds(hand, pillar, false, new Set(["5-clubs"])).size,
    ).toBe(0);
  });
});

describe("bossAdjustHandEntry (The Arm / The Flint)", () => {
  const arm = createBossCatalog().find((b) => b.id === "the-arm")!;
  const flint = createBossCatalog().find((b) => b.id === "the-flint")!;
  const wall = createBossCatalog().find((b) => b.id === "the-wall")!;
  const level1Pair = { chips: 10, multiplier: 2, level: 1 } as const;
  const level2Pair = { chips: 25, multiplier: 3, level: 2 } as const;

  test("Flint halves chips and mult (floored)", () => {
    expect(bossAdjustHandEntry(flint, "Pair", level1Pair)).toEqual({
      chips: 5,
      multiplier: 1,
      level: 1,
    });
  });

  test("Flint never drops chips below 1", () => {
    const tiny = { chips: 1, multiplier: 2, level: 1 } as const;
    expect(bossAdjustHandEntry(flint, "Pair", tiny).chips).toBe(1);
  });

  test("Arm leaves level-1 entries unchanged", () => {
    expect(bossAdjustHandEntry(arm, "Pair", level1Pair)).toEqual(level1Pair);
  });

  test("Arm subtracts the planet upgrade from a level-2 entry (Pair → Mercury)", () => {
    expect(bossAdjustHandEntry(arm, "Pair", level2Pair)).toEqual({
      chips: 10,
      multiplier: 2,
      level: 1,
    });
  });

  test("non-adjusting bosses return the entry unchanged", () => {
    expect(bossAdjustHandEntry(wall, "Pair", level2Pair)).toEqual(level2Pair);
  });

  test("null boss returns the entry unchanged", () => {
    expect(bossAdjustHandEntry(null, "Pair", level2Pair)).toEqual(level2Pair);
  });
});

describe("Phase 4 face-down catalog entries", () => {
  test.each([
    ["the-house", { kind: "face-down-initial" }, 2],
    ["the-fish", { kind: "face-down-on-refill" }, 2],
    ["the-wheel", { kind: "face-down-chance", oneIn: 7 }, 2],
    ["the-mark", { kind: "face-down-faces" }, 2],
  ] as const)("%s has the expected effect", (id, effect, anteMin) => {
    const boss = createBossCatalog().find((b) => b.id === id);
    expect(boss?.effect).toEqual(effect);
    expect(boss?.anteMin).toBe(anteMin);
  });
});

describe("applyBossFaceDown", () => {
  const sample: ReadonlyArray<Card> = [
    { id: 1, rank: "5", suit: "spades" },
    { id: 2, rank: "K", suit: "hearts" },
    { id: 3, rank: "2", suit: "clubs" },
  ];
  const house = createBossCatalog().find((b) => b.id === "the-house")!;
  const fish = createBossCatalog().find((b) => b.id === "the-fish")!;
  const wheel = createBossCatalog().find((b) => b.id === "the-wheel")!;
  const mark = createBossCatalog().find((b) => b.id === "the-mark")!;
  const wall = createBossCatalog().find((b) => b.id === "the-wall")!;

  test("returns cards unchanged when not a boss round", () => {
    expect(applyBossFaceDown(sample, house, false, "initial")).toEqual(sample);
  });

  test("returns cards unchanged when boss is null", () => {
    expect(applyBossFaceDown(sample, null, true, "initial")).toEqual(sample);
  });

  test("The House face-downs every initial-deal card", () => {
    expect(
      applyBossFaceDown(sample, house, true, "initial").every(
        (c) => c.faceDown === true,
      ),
    ).toBe(true);
  });

  test("The House leaves refill draws face-up", () => {
    expect(
      applyBossFaceDown(sample, house, true, "refill").some((c) => c.faceDown),
    ).toBe(false);
  });

  test("The Fish leaves the initial deal face-up", () => {
    expect(
      applyBossFaceDown(sample, fish, true, "initial").some((c) => c.faceDown),
    ).toBe(false);
  });

  test("The Fish face-downs every refill draw", () => {
    expect(
      applyBossFaceDown(sample, fish, true, "refill").every(
        (c) => c.faceDown === true,
      ),
    ).toBe(true);
  });

  test("The Mark face-downs only face cards", () => {
    const out = applyBossFaceDown(sample, mark, true, "initial");
    expect(out.find((c) => c.id === 2)?.faceDown).toBe(true);
    expect(out.find((c) => c.id === 1)?.faceDown).toBeUndefined();
    expect(out.find((c) => c.id === 3)?.faceDown).toBeUndefined();
  });

  test("The Wheel uses the rng to face-down 1-in-N cards", () => {
    const allFaceDown = applyBossFaceDown(
      sample,
      wheel,
      true,
      "initial",
      () => 0,
    );
    expect(allFaceDown.every((c) => c.faceDown === true)).toBe(true);
  });

  test("The Wheel leaves cards face-up when rng exceeds the threshold", () => {
    const noneFaceDown = applyBossFaceDown(
      sample,
      wheel,
      true,
      "initial",
      () => 0.99,
    );
    expect(noneFaceDown.some((c) => c.faceDown)).toBe(false);
  });

  test("Non face-down bosses leave the hand face-up", () => {
    expect(
      applyBossFaceDown(sample, wall, true, "initial").some((c) => c.faceDown),
    ).toBe(false);
  });
});

describe("Phase 5 boss catalog — The Hook", () => {
  test("the-hook has the post-play-random-held-discard effect with count 2", () => {
    const hook = createBossCatalog().find((b) => b.id === "the-hook");
    expect(hook?.effect).toEqual({
      kind: "post-play-random-held-discard",
      count: 2,
    });
  });

  test("the-hook is available from ante 1", () => {
    const hook = createBossCatalog().find((b) => b.id === "the-hook");
    expect(hook?.anteMin).toBe(1);
  });

  test("the-hook applies the standard 2x score multiplier", () => {
    const hook = createBossCatalog().find((b) => b.id === "the-hook");
    expect(hook?.scoreMultiplier).toBe(2);
  });
});

describe("bossPostPlayDiscardCount", () => {
  test("returns 2 for The Hook", () => {
    const hook = createBossCatalog().find((b) => b.id === "the-hook")!;
    expect(bossPostPlayDiscardCount(hook)).toBe(2);
  });

  test("returns 0 for a non-hook boss", () => {
    const wall = createBossCatalog().find((b) => b.id === "the-wall")!;
    expect(bossPostPlayDiscardCount(wall)).toBe(0);
  });

  test("returns 0 when boss is null", () => {
    expect(bossPostPlayDiscardCount(null)).toBe(0);
  });
});

function makeHandPlayCounts(
  overrides: Partial<Record<HandLabel, number>> = {},
): Record<HandLabel, number> {
  return {
    "High Card": 0,
    Pair: 0,
    "Two Pair": 0,
    "Three of a Kind": 0,
    Straight: 0,
    Flush: 0,
    "Full House": 0,
    "Four of a Kind": 0,
    "Straight Flush": 0,
    "Royal Flush": 0,
    "Five of a Kind": 0,
    "Flush House": 0,
    "Flush Five": 0,
    ...overrides,
  };
}

describe("Phase 5 boss catalog — The Serpent", () => {
  test("the-serpent has the fixed-refill-count effect with value 3", () => {
    const serpent = createBossCatalog().find((b) => b.id === "the-serpent");
    expect(serpent?.effect).toEqual({ kind: "fixed-refill-count", value: 3 });
  });

  test("the-serpent requires ante 5+", () => {
    const serpent = createBossCatalog().find((b) => b.id === "the-serpent");
    expect(serpent?.anteMin).toBe(5);
  });

  test("the-serpent applies the standard 2x score multiplier", () => {
    const serpent = createBossCatalog().find((b) => b.id === "the-serpent");
    expect(serpent?.scoreMultiplier).toBe(2);
  });

  test("ante 4 excludes The Serpent", () => {
    const ids = availableBosses(createBossCatalog(), 4).map((b) => b.id);
    expect(ids).not.toContain("the-serpent");
  });

  test("ante 5 includes The Serpent", () => {
    const ids = availableBosses(createBossCatalog(), 5).map((b) => b.id);
    expect(ids).toContain("the-serpent");
  });
});

describe("bossRefillCountOverride (The Serpent)", () => {
  const serpent = createBossCatalog().find((b) => b.id === "the-serpent")!;
  const wall = createBossCatalog().find((b) => b.id === "the-wall")!;

  test("returns 3 under The Serpent on a boss round, regardless of defaultCount", () => {
    expect(bossRefillCountOverride(serpent, true, 7, 30)).toBe(3);
  });

  test("returns the default when boss is null", () => {
    expect(bossRefillCountOverride(null, true, 5, 30)).toBe(5);
  });

  test("returns the default for a non-Serpent boss", () => {
    expect(bossRefillCountOverride(wall, true, 5, 30)).toBe(5);
  });

  test("returns the default when isBossRound is false", () => {
    expect(bossRefillCountOverride(serpent, false, 5, 30)).toBe(5);
  });

  test("clamps the override to the remaining deck size when deck is short", () => {
    expect(bossRefillCountOverride(serpent, true, 7, 1)).toBe(1);
  });

  test("returns 0 when the deck is empty even though the boss override is 3", () => {
    expect(bossRefillCountOverride(serpent, true, 7, 0)).toBe(0);
  });
});

describe("Phase 5 boss catalog — The Ox", () => {
  test("the-ox has the zero-wallet-on-most-played-hand effect", () => {
    const ox = createBossCatalog().find((b) => b.id === "the-ox");
    expect(ox?.effect).toEqual({ kind: "zero-wallet-on-most-played-hand" });
  });

  test("the-ox requires ante 6+", () => {
    const ox = createBossCatalog().find((b) => b.id === "the-ox");
    expect(ox?.anteMin).toBe(6);
  });

  test("the-ox applies the standard 2x score multiplier", () => {
    const ox = createBossCatalog().find((b) => b.id === "the-ox");
    expect(ox?.scoreMultiplier).toBe(2);
  });

  test("ante 5 excludes The Ox", () => {
    const ids = availableBosses(createBossCatalog(), 5).map((b) => b.id);
    expect(ids).not.toContain("the-ox");
  });

  test("ante 6 includes The Ox", () => {
    const ids = availableBosses(createBossCatalog(), 6).map((b) => b.id);
    expect(ids).toContain("the-ox");
  });
});

describe("bossShouldZeroWallet (The Ox)", () => {
  const ox = createBossCatalog().find((b) => b.id === "the-ox")!;
  const wall = createBossCatalog().find((b) => b.id === "the-wall")!;

  test("returns true for the most-played hand on a boss round", () => {
    const counts = makeHandPlayCounts({ "High Card": 5, Pair: 3 });
    expect(bossShouldZeroWallet(ox, true, "High Card", counts)).toBe(true);
  });

  test("returns false for a non-most-played hand on a boss round", () => {
    const counts = makeHandPlayCounts({ "High Card": 5, Pair: 3 });
    expect(bossShouldZeroWallet(ox, true, "Pair", counts)).toBe(false);
  });

  test("returns false for a non-Ox boss", () => {
    const counts = makeHandPlayCounts({ "High Card": 5 });
    expect(bossShouldZeroWallet(wall, true, "High Card", counts)).toBe(false);
  });

  test("returns false when boss is null", () => {
    const counts = makeHandPlayCounts({ "High Card": 5 });
    expect(bossShouldZeroWallet(null, true, "High Card", counts)).toBe(false);
  });

  test("returns false when isBossRound is false even with Ox active", () => {
    const counts = makeHandPlayCounts({ "High Card": 5 });
    expect(bossShouldZeroWallet(ox, false, "High Card", counts)).toBe(false);
  });

  test("tie-break favors the lower-ranked hand (matches mostPlayedHand)", () => {
    const counts = makeHandPlayCounts({ "High Card": 3, Pair: 3 });
    expect(bossShouldZeroWallet(ox, true, "High Card", counts)).toBe(true);
  });

  test("tie-break does NOT trigger the wipe for the higher-ranked tied hand", () => {
    const counts = makeHandPlayCounts({ "High Card": 3, Pair: 3 });
    expect(bossShouldZeroWallet(ox, true, "Pair", counts)).toBe(false);
  });
});

describe("pickBossForAnte — Phase 5 ante gating", () => {
  test("returns The Serpent for ante 5 when picker selects it", () => {
    const catalog = createBossCatalog();
    const serpent = catalog.find((b) => b.id === "the-serpent")!;
    expect(
      pickBossForAnte({
        ante: 5,
        catalog: [serpent],
        rng: () => 0,
      }).id,
    ).toBe("the-serpent");
  });

  test("never returns The Serpent at ante 4", () => {
    const catalog = createBossCatalog();
    const eligible = availableBosses(catalog, 4);
    expect(eligible.some((b) => b.id === "the-serpent")).toBe(false);
  });

  test("returns The Ox for ante 6 when picker selects it", () => {
    const catalog = createBossCatalog();
    const ox = catalog.find((b) => b.id === "the-ox")!;
    expect(
      pickBossForAnte({
        ante: 6,
        catalog: [ox],
        rng: () => 0,
      }).id,
    ).toBe("the-ox");
  });

  test("never returns The Ox at ante 5", () => {
    const catalog = createBossCatalog();
    const eligible = availableBosses(catalog, 5);
    expect(eligible.some((b) => b.id === "the-ox")).toBe(false);
  });
});

describe("pickHookDiscardIds", () => {
  const buildHand = (count: number): ReadonlyArray<Card> =>
    Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      rank: "5" as const,
      suit: "clubs" as const,
    }));

  test("returns the first N ids when rng is always 0 (deterministic head pick)", () => {
    const hand = buildHand(5);
    expect(pickHookDiscardIds(hand, new Set(), 2, () => 0)).toEqual([1, 2]);
  });

  test("excludes the submitted selection from the candidate pool", () => {
    const hand = buildHand(5);
    expect(
      pickHookDiscardIds(hand, new Set([1, 2]), 2, () => 0),
    ).toEqual([3, 4]);
  });

  test("caps the picked count at the candidate pool size", () => {
    const hand = buildHand(3);
    expect(
      pickHookDiscardIds(hand, new Set([1, 2]), 2, () => 0),
    ).toEqual([3]);
  });

  test("returns an empty array when no non-played cards remain", () => {
    const hand = buildHand(2);
    expect(pickHookDiscardIds(hand, new Set([1, 2]), 2, () => 0)).toEqual([]);
  });

  test("never picks the same id twice (no replacement)", () => {
    const hand = buildHand(4);
    const picked = pickHookDiscardIds(hand, new Set(), 2, () => 0.5);
    expect(new Set(picked).size).toBe(picked.length);
  });

  test("uses the provided rng deterministically", () => {
    const hand = buildHand(4);
    const rng = vi.fn().mockReturnValueOnce(0.75).mockReturnValueOnce(0);
    const picked = pickHookDiscardIds(hand, new Set(), 2, rng);
    expect(picked).toEqual([4, 1]);
  });
});

const SHOWDOWN_IDS = [
  "amber-acorn",
  "verdant-leaf",
  "violet-vessel",
  "crimson-heart",
  "cerulean-bell",
];

describe("isShowdownAnte", () => {
  test.each([
    [8, true],
    [16, true],
    [24, true],
    [1, false],
    [7, false],
    [9, false],
    [0, false],
  ])("ante %i -> %s", (ante, expected) => {
    expect(isShowdownAnte(ante)).toBe(expected);
  });
});

describe("showdown boss catalog entries", () => {
  test("Violet Vessel is a 6x blind with no special rule", () => {
    const vessel = createBossCatalog().find((b) => b.id === "violet-vessel")!;
    expect(vessel.scoreMultiplier).toBe(6);
  });

  test("Violet Vessel only appears from ante 8", () => {
    const vessel = createBossCatalog().find((b) => b.id === "violet-vessel")!;
    expect(vessel.anteMin).toBe(8);
  });

  test("Verdant Leaf debuffs all cards until a Joker is sold", () => {
    const leaf = createBossCatalog().find((b) => b.id === "verdant-leaf")!;
    expect(leaf.effect).toEqual({ kind: "debuff-all-until-joker-sold" });
  });

  test("Verdant Leaf only appears from ante 8", () => {
    const leaf = createBossCatalog().find((b) => b.id === "verdant-leaf")!;
    expect(leaf.anteMin).toBe(8);
  });

  test("Amber Acorn flips and shuffles Jokers", () => {
    const acorn = createBossCatalog().find((b) => b.id === "amber-acorn")!;
    expect(acorn.effect).toEqual({ kind: "flip-shuffle-jokers" });
  });

  test("Amber Acorn only appears from ante 8", () => {
    const acorn = createBossCatalog().find((b) => b.id === "amber-acorn")!;
    expect(acorn.anteMin).toBe(8);
  });

  test("Crimson Heart disables a random Joker each hand", () => {
    const heart = createBossCatalog().find((b) => b.id === "crimson-heart")!;
    expect(heart.effect).toEqual({ kind: "disable-random-joker-each-hand" });
  });

  test("Crimson Heart only appears from ante 8", () => {
    const heart = createBossCatalog().find((b) => b.id === "crimson-heart")!;
    expect(heart.anteMin).toBe(8);
  });
});

describe("bossDisablesRandomJoker", () => {
  test("is true for Crimson Heart", () => {
    const heart = createBossCatalog().find((b) => b.id === "crimson-heart")!;
    expect(bossDisablesRandomJoker(heart)).toBe(true);
  });

  test("is false for a non-disabling boss (negative)", () => {
    const acorn = createBossCatalog().find((b) => b.id === "amber-acorn")!;
    expect(bossDisablesRandomJoker(acorn)).toBe(false);
  });

  test("is false when there is no boss (negative)", () => {
    expect(bossDisablesRandomJoker(null)).toBe(false);
  });
});

describe("bossHidesJokers", () => {
  test("is true for Amber Acorn", () => {
    const acorn = createBossCatalog().find((b) => b.id === "amber-acorn")!;
    expect(bossHidesJokers(acorn)).toBe(true);
  });

  test("is false for a non-flip boss (negative)", () => {
    const vessel = createBossCatalog().find((b) => b.id === "violet-vessel")!;
    expect(bossHidesJokers(vessel)).toBe(false);
  });

  test("is false when there is no boss (negative)", () => {
    expect(bossHidesJokers(null)).toBe(false);
  });
});

describe("bossPoolForAnte — showdown gating", () => {
  test("ante 8 draws only from the showdown pool", () => {
    const ids = bossPoolForAnte(createBossCatalog(), 8).map((b) => b.id);
    expect(ids.every((id) => SHOWDOWN_IDS.includes(id))).toBe(true);
  });

  test("ante 8 includes the implemented showdown bosses", () => {
    const ids = bossPoolForAnte(createBossCatalog(), 8).map((b) => b.id);
    expect(ids).toEqual(
      expect.arrayContaining(["violet-vessel", "verdant-leaf"]),
    );
  });

  test("ante 16 draws only from the showdown pool", () => {
    const ids = bossPoolForAnte(createBossCatalog(), 16).map((b) => b.id);
    expect(ids.every((id) => SHOWDOWN_IDS.includes(id))).toBe(true);
  });

  test("ante 7 never includes a showdown boss (negative)", () => {
    const ids = bossPoolForAnte(createBossCatalog(), 7).map((b) => b.id);
    expect(ids.some((id) => SHOWDOWN_IDS.includes(id))).toBe(false);
  });

  test("ante 9 never includes a showdown boss (negative)", () => {
    const ids = bossPoolForAnte(createBossCatalog(), 9).map((b) => b.id);
    expect(ids.some((id) => SHOWDOWN_IDS.includes(id))).toBe(false);
  });
});

describe("pickBossForAnte — showdown antes", () => {
  test("ante 8 returns a showdown boss", () => {
    expect(SHOWDOWN_IDS).toContain(pickBossForAnte({ ante: 8, rng: () => 0 }).id);
  });

  test("ante 16 returns a showdown boss", () => {
    expect(SHOWDOWN_IDS).toContain(
      pickBossForAnte({ ante: 16, rng: () => 0.99 }).id,
    );
  });

  test("ante 7 never returns a showdown boss (negative)", () => {
    const picks = [0, 0.3, 0.6, 0.99].map(
      (r) => pickBossForAnte({ ante: 7, rng: () => r }).id,
    );
    expect(picks.some((id) => SHOWDOWN_IDS.includes(id))).toBe(false);
  });
});

describe("isCardDebuffedByBoss — Verdant Leaf", () => {
  const leaf = createBossCatalog().find((b) => b.id === "verdant-leaf")!;

  test("debuffs an arbitrary card while active", () => {
    expect(isCardDebuffedByBoss(leaf, { id: 1, rank: "5", suit: "clubs" })).toBe(
      true,
    );
  });

  test("debuffs every card in a mixed hand", () => {
    const hand: ReadonlyArray<Card> = [
      { id: 1, rank: "2", suit: "hearts" },
      { id: 2, rank: "K", suit: "spades" },
      { id: 3, rank: "9", suit: "diamonds" },
    ];
    expect(debuffedHandIds(hand, leaf, true).size).toBe(3);
  });
});
