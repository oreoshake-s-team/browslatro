// @vitest-environment node
import {
  BONUS_ENHANCEMENT_CHIPS,
  ENHANCEMENT_KINDS,
  GLASS_ENHANCEMENT_DESTROY_CHANCE,
  GLASS_ENHANCEMENT_MULT_TIMES,
  LUCKY_ENHANCEMENT_MONEY_AMOUNT,
  LUCKY_ENHANCEMENT_MONEY_CHANCE,
  LUCKY_ENHANCEMENT_MULT_AMOUNT,
  LUCKY_ENHANCEMENT_MULT_CHANCE,
  MULT_ENHANCEMENT_MULT_DELTA,
  NO_ENHANCEMENT_EFFECT,
  STONE_ENHANCEMENT_CHIPS,
  applyCardEnhancement,
  applyLuckyRolls,
  cardRankForEvaluation,
  cardSuitForEvaluation,
  enhancementRngConfig,
  isStoneCard,
  rollEnhancementChance,
} from "./enhancements";
import type { Card, Enhancement } from "./types";

function makeCard(enhancement?: Enhancement | null): Card {
  return enhancement === undefined
    ? { id: 1, rank: "5", suit: "spades" }
    : { id: 1, rank: "5", suit: "spades", enhancement };
}

describe("ENHANCEMENT_KINDS", () => {
  test("contains exactly eight enhancements", () => {
    expect(ENHANCEMENT_KINDS).toHaveLength(8);
  });

  test("includes bonus", () => {
    expect(ENHANCEMENT_KINDS).toContain("bonus");
  });

  test("includes mult", () => {
    expect(ENHANCEMENT_KINDS).toContain("mult");
  });

  test("includes wild", () => {
    expect(ENHANCEMENT_KINDS).toContain("wild");
  });

  test("includes glass", () => {
    expect(ENHANCEMENT_KINDS).toContain("glass");
  });

  test("includes steel", () => {
    expect(ENHANCEMENT_KINDS).toContain("steel");
  });

  test("includes stone", () => {
    expect(ENHANCEMENT_KINDS).toContain("stone");
  });

  test("includes gold", () => {
    expect(ENHANCEMENT_KINDS).toContain("gold");
  });

  test("includes lucky", () => {
    expect(ENHANCEMENT_KINDS).toContain("lucky");
  });
});

describe("applyCardEnhancement — vanilla card", () => {
  test("returns the no-op effect for a card with no enhancement", () => {
    expect(applyCardEnhancement(makeCard())).toEqual(NO_ENHANCEMENT_EFFECT);
  });

  test("returns the no-op effect for an explicitly null enhancement", () => {
    expect(applyCardEnhancement(makeCard(null))).toEqual(NO_ENHANCEMENT_EFFECT);
  });
});

describe("applyCardEnhancement — foundation no-op per enhancement", () => {
  for (const kind of ENHANCEMENT_KINDS) {
    if (kind === "bonus") continue;
    if (kind === "mult") continue;
    if (kind === "glass") continue;
    if (kind === "stone") continue;
    test(`returns the no-op effect for ${kind} (foundation does not implement effects)`, () => {
      expect(applyCardEnhancement(makeCard(kind))).toEqual(NO_ENHANCEMENT_EFFECT);
    });
  }
});

describe("applyCardEnhancement — Stone", () => {
  test("returns +50 chipsDelta for a Stone card", () => {
    expect(applyCardEnhancement(makeCard("stone")).chipsDelta).toBe(
      STONE_ENHANCEMENT_CHIPS,
    );
  });

  test("STONE_ENHANCEMENT_CHIPS equals 50 per the Balatro wiki", () => {
    expect(STONE_ENHANCEMENT_CHIPS).toBe(50);
  });

  test("Stone does not change multDelta", () => {
    expect(applyCardEnhancement(makeCard("stone")).multDelta).toBe(0);
  });

  test("Stone does not change multTimes", () => {
    expect(applyCardEnhancement(makeCard("stone")).multTimes).toBe(1);
  });
});

describe("isStoneCard", () => {
  test("returns true for a Stone card", () => {
    expect(isStoneCard(makeCard("stone"))).toBe(true);
  });

  test("returns false for a vanilla card", () => {
    expect(isStoneCard(makeCard())).toBe(false);
  });

  test("returns false for a non-Stone enhanced card", () => {
    expect(isStoneCard(makeCard("gold"))).toBe(false);
  });
});

describe("applyCardEnhancement — Glass", () => {
  test("returns multTimes=2 for a Glass card", () => {
    expect(applyCardEnhancement(makeCard("glass")).multTimes).toBe(
      GLASS_ENHANCEMENT_MULT_TIMES,
    );
  });

  test("returns destroyChance=0.25 for a Glass card", () => {
    expect(applyCardEnhancement(makeCard("glass")).destroyChance).toBe(
      GLASS_ENHANCEMENT_DESTROY_CHANCE,
    );
  });

  test("GLASS_ENHANCEMENT_MULT_TIMES equals 2 per the Balatro wiki", () => {
    expect(GLASS_ENHANCEMENT_MULT_TIMES).toBe(2);
  });

  test("GLASS_ENHANCEMENT_DESTROY_CHANCE equals 0.25 per the Balatro wiki", () => {
    expect(GLASS_ENHANCEMENT_DESTROY_CHANCE).toBe(0.25);
  });

  test("Glass does not change chipsDelta", () => {
    expect(applyCardEnhancement(makeCard("glass")).chipsDelta).toBe(0);
  });

  test("Glass does not change multDelta", () => {
    expect(applyCardEnhancement(makeCard("glass")).multDelta).toBe(0);
  });
});

describe("rollEnhancementChance", () => {
  const originalRng = enhancementRngConfig.rng;
  afterEach(() => {
    enhancementRngConfig.rng = originalRng;
  });

  test("returns false for a 0 chance regardless of the rng", () => {
    enhancementRngConfig.rng = () => 0;
    expect(rollEnhancementChance(0)).toBe(false);
  });

  test("returns true for a 1 chance regardless of the rng", () => {
    enhancementRngConfig.rng = () => 0.999;
    expect(rollEnhancementChance(1)).toBe(true);
  });

  test("returns true when the rng undershoots the threshold", () => {
    enhancementRngConfig.rng = () => 0.1;
    expect(rollEnhancementChance(0.25)).toBe(true);
  });

  test("returns false when the rng meets the threshold", () => {
    enhancementRngConfig.rng = () => 0.25;
    expect(rollEnhancementChance(0.25)).toBe(false);
  });

  test("returns false when the rng exceeds the threshold", () => {
    enhancementRngConfig.rng = () => 0.5;
    expect(rollEnhancementChance(0.25)).toBe(false);
  });
});

describe("applyCardEnhancement — Mult", () => {
  test("returns +4 multDelta for a Mult card", () => {
    expect(applyCardEnhancement(makeCard("mult")).multDelta).toBe(
      MULT_ENHANCEMENT_MULT_DELTA,
    );
  });

  test("MULT_ENHANCEMENT_MULT_DELTA equals 4 per the Balatro wiki", () => {
    expect(MULT_ENHANCEMENT_MULT_DELTA).toBe(4);
  });

  test("Mult does not change chipsDelta", () => {
    expect(applyCardEnhancement(makeCard("mult")).chipsDelta).toBe(0);
  });

  test("Mult does not change multTimes", () => {
    expect(applyCardEnhancement(makeCard("mult")).multTimes).toBe(1);
  });
});

describe("applyCardEnhancement — Bonus", () => {
  test("returns +30 chipsDelta for a Bonus card", () => {
    expect(applyCardEnhancement(makeCard("bonus")).chipsDelta).toBe(
      BONUS_ENHANCEMENT_CHIPS,
    );
  });

  test("BONUS_ENHANCEMENT_CHIPS equals 30 per the Balatro wiki", () => {
    expect(BONUS_ENHANCEMENT_CHIPS).toBe(30);
  });

  test("Bonus does not change multDelta", () => {
    expect(applyCardEnhancement(makeCard("bonus")).multDelta).toBe(0);
  });

  test("Bonus does not change multTimes", () => {
    expect(applyCardEnhancement(makeCard("bonus")).multTimes).toBe(1);
  });
});

describe("NO_ENHANCEMENT_EFFECT", () => {
  test("has chipsDelta of 0", () => {
    expect(NO_ENHANCEMENT_EFFECT.chipsDelta).toBe(0);
  });

  test("has multDelta of 0", () => {
    expect(NO_ENHANCEMENT_EFFECT.multDelta).toBe(0);
  });

  test("has multTimes of 1 (identity for multiplication)", () => {
    expect(NO_ENHANCEMENT_EFFECT.multTimes).toBe(1);
  });

  test("has moneyDelta of 0", () => {
    expect(NO_ENHANCEMENT_EFFECT.moneyDelta).toBe(0);
  });

  test("has destroyChance of 0", () => {
    expect(NO_ENHANCEMENT_EFFECT.destroyChance).toBe(0);
  });
});

describe("cardSuitForEvaluation", () => {
  test("returns the card's suit for a vanilla card", () => {
    expect(cardSuitForEvaluation(makeCard())).toBe("spades");
  });

  test("returns the card's suit for every non-wild non-stone enhancement", () => {
    const suits = ENHANCEMENT_KINDS.filter(
      (k) => k !== "wild" && k !== "stone",
    ).map((k) => cardSuitForEvaluation(makeCard(k)));
    expect(suits.every((s) => s === "spades")).toBe(true);
  });

  test("returns null for a Wild card so the hand evaluator treats it as any suit", () => {
    expect(cardSuitForEvaluation(makeCard("wild"))).toBeNull();
  });

  test("returns null for a Stone card so suit-based detection skips it", () => {
    expect(cardSuitForEvaluation(makeCard("stone"))).toBeNull();
  });
});

describe("cardRankForEvaluation", () => {
  test("returns the card's rank for a vanilla card", () => {
    expect(cardRankForEvaluation(makeCard())).toBe("5");
  });

  test("returns the card's rank for every non-stone enhancement", () => {
    const ranks = ENHANCEMENT_KINDS.filter((k) => k !== "stone").map((k) =>
      cardRankForEvaluation(makeCard(k)),
    );
    expect(ranks.every((r) => r === "5")).toBe(true);
  });

  test("returns null for a Stone card so rank-based detection skips it", () => {
    expect(cardRankForEvaluation(makeCard("stone"))).toBeNull();
  });
});

describe("Lucky enhancement constants", () => {
  test("LUCKY_ENHANCEMENT_MULT_CHANCE equals 1-in-5 per the Balatro wiki", () => {
    expect(LUCKY_ENHANCEMENT_MULT_CHANCE).toBe(0.2);
  });

  test("LUCKY_ENHANCEMENT_MULT_AMOUNT equals 20 per the Balatro wiki", () => {
    expect(LUCKY_ENHANCEMENT_MULT_AMOUNT).toBe(20);
  });

  test("LUCKY_ENHANCEMENT_MONEY_CHANCE equals 1-in-15 per the Balatro wiki", () => {
    expect(LUCKY_ENHANCEMENT_MONEY_CHANCE).toBe(1 / 15);
  });

  test("LUCKY_ENHANCEMENT_MONEY_AMOUNT equals 20 per the Balatro wiki", () => {
    expect(LUCKY_ENHANCEMENT_MONEY_AMOUNT).toBe(20);
  });
});

describe("applyLuckyRolls", () => {
  const originalRng = enhancementRngConfig.rng;
  afterEach(() => {
    enhancementRngConfig.rng = originalRng;
  });

  function luckyCard(): Card {
    return { id: 1, rank: "Q", suit: "spades", enhancement: "lucky" };
  }

  function vanillaCard(): Card {
    return { id: 1, rank: "Q", suit: "spades" };
  }

  test("returns zero bonuses for a non-Lucky card regardless of rng", () => {
    enhancementRngConfig.rng = () => 0;
    expect(applyLuckyRolls(vanillaCard())).toEqual({
      multBonus: 0,
      moneyBonus: 0,
    });
  });

  test("both rolls hit returns +20 mult AND +$20", () => {
    enhancementRngConfig.rng = () => 0;
    expect(applyLuckyRolls(luckyCard())).toEqual({
      multBonus: LUCKY_ENHANCEMENT_MULT_AMOUNT,
      moneyBonus: LUCKY_ENHANCEMENT_MONEY_AMOUNT,
    });
  });

  test("mult hits but money misses returns only +20 mult", () => {
    const values = [0.1, 0.5];
    let i = 0;
    enhancementRngConfig.rng = () => values[i++];
    expect(applyLuckyRolls(luckyCard())).toEqual({
      multBonus: LUCKY_ENHANCEMENT_MULT_AMOUNT,
      moneyBonus: 0,
    });
  });

  test("money hits but mult misses returns only +$20", () => {
    const values = [0.5, 0.05];
    let i = 0;
    enhancementRngConfig.rng = () => values[i++];
    expect(applyLuckyRolls(luckyCard())).toEqual({
      multBonus: 0,
      moneyBonus: LUCKY_ENHANCEMENT_MONEY_AMOUNT,
    });
  });

  test("both rolls miss returns zero bonuses", () => {
    enhancementRngConfig.rng = () => 0.999;
    expect(applyLuckyRolls(luckyCard())).toEqual({
      multBonus: 0,
      moneyBonus: 0,
    });
  });

  test("two scoring Lucky cards roll independently", () => {
    enhancementRngConfig.rng = () => 0;
    const a = applyLuckyRolls(luckyCard());
    const b = applyLuckyRolls(luckyCard());
    expect(a.multBonus + b.multBonus).toBe(2 * LUCKY_ENHANCEMENT_MULT_AMOUNT);
  });
});
