// @vitest-environment node
import { ENHANCEMENT_KINDS } from "../cards/enhancements";
import {
  HERMIT_MONEY_CAP,
  TEMPERANCE_MONEY_CAP,
  createTarotCatalog,
  nextRankUp,
  resolveHermitPayout,
  resolveTemperancePayout,
  rollWheelOfFortune,
  type TarotCard,
} from "./tarots";
import { chanceOverrideConfig } from "../dev/chanceOverride";
import {
  JOKER_EDITION_KINDS,
  createBusinessCardJoker,
  createPlusFourMultJoker,
  type Joker,
  type RandomSource,
} from "./jokers";

function tarotById(id: string): TarotCard {
  const found = createTarotCatalog().find((t) => t.id === id);
  if (!found) throw new Error(`No tarot with id ${id}`);
  return found;
}

describe("createTarotCatalog", () => {
  test("contains seventeen entries (eight apply-enhancement + Hermit + Temperance + Wheel of Fortune + Hanged Man + Strength + Star + Moon + Sun + World)", () => {
    expect(createTarotCatalog()).toHaveLength(17);
  });

  test("has unique ids", () => {
    const ids = createTarotCatalog().map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

});

describe("enhancement tarots reference valid Enhancement kinds", () => {
  test("every apply-enhancement tarot references a known Enhancement", () => {
    const validKinds = new Set<string>(ENHANCEMENT_KINDS);
    const allValid = createTarotCatalog()
      .flatMap((t) => (t.effect.kind === "apply-enhancement" ? [t.effect.enhancement] : []))
      .every((e) => validKinds.has(e));
    expect(allValid).toBe(true);
  });
});

describe("enhancement tarot maxTargets table", () => {
  const cases: ReadonlyArray<{
    id: string;
    enhancement: string;
    maxTargets: 1 | 2;
  }> = [
    { id: "the-magician", enhancement: "lucky", maxTargets: 2 },
    { id: "the-empress", enhancement: "mult", maxTargets: 2 },
    { id: "the-hierophant", enhancement: "bonus", maxTargets: 2 },
    { id: "the-lovers", enhancement: "wild", maxTargets: 1 },
    { id: "the-chariot", enhancement: "steel", maxTargets: 1 },
    { id: "justice", enhancement: "glass", maxTargets: 1 },
    { id: "the-devil", enhancement: "gold", maxTargets: 1 },
    { id: "the-tower", enhancement: "stone", maxTargets: 1 },
  ];
  test.each(cases)(
    "$id applies $enhancement to up to $maxTargets card(s)",
    ({ id, enhancement, maxTargets }) => {
      const tarot = tarotById(id);
      expect(tarot.effect).toEqual({
        kind: "apply-enhancement",
        enhancement,
        maxTargets,
      });
    },
  );
});

describe("The Hermit (money-multiply tarot)", () => {
  test("has a money-multiply effect at multiplier 2", () => {
    const hermit = tarotById("the-hermit");
    expect(hermit.effect).toMatchObject({
      kind: "money-multiply",
      multiplier: 2,
      bonusCap: HERMIT_MONEY_CAP,
    });
  });
});

describe("resolveHermitPayout", () => {
  test("returns money when money is below the cap (doubles effectively)", () => {
    expect(resolveHermitPayout(7)).toBe(7);
  });

  test("caps the payout at HERMIT_MONEY_CAP", () => {
    expect(resolveHermitPayout(100)).toBe(HERMIT_MONEY_CAP);
  });

  test("returns 0 when money is zero", () => {
    expect(resolveHermitPayout(0)).toBe(0);
  });

  test("returns 0 when money is negative (defensive)", () => {
    expect(resolveHermitPayout(-5)).toBe(0);
  });

  test("respects a custom cap override", () => {
    expect(resolveHermitPayout(50, 10)).toBe(10);
  });
});

describe("Temperance", () => {
  test("temperance is in the catalog with the canonical name", () => {
    expect(tarotById("temperance").name).toBe("Temperance");
  });

  test("temperance describes the cap in its description", () => {
    expect(tarotById("temperance").description).toMatch(/\$50/);
  });

  test("temperance effect kind is joker-sell-value-payout", () => {
    expect(tarotById("temperance").effect.kind).toBe("joker-sell-value-payout");
  });
});

describe("resolveTemperancePayout", () => {
  test("returns 0 with no jokers equipped", () => {
    expect(resolveTemperancePayout([])).toBe(0);
  });

  test("one joker pays out that joker's sell value", () => {
    const jokers: ReadonlyArray<Joker> = [createPlusFourMultJoker()];
    expect(resolveTemperancePayout(jokers)).toBe(2);
  });

  test("five jokers pay out 5 × $2", () => {
    const jokers: ReadonlyArray<Joker> = [
      createPlusFourMultJoker(),
      createBusinessCardJoker(),
      createPlusFourMultJoker(),
      createBusinessCardJoker(),
      createPlusFourMultJoker(),
    ];
    expect(resolveTemperancePayout(jokers)).toBe(10);
  });

  test("caps at TEMPERANCE_MONEY_CAP when total exceeds it", () => {
    const jokers: ReadonlyArray<Joker> = Array.from({ length: 40 }, () =>
      createPlusFourMultJoker(),
    );
    expect(resolveTemperancePayout(jokers)).toBe(TEMPERANCE_MONEY_CAP);
  });

  test("respects a custom cap argument", () => {
    const jokers: ReadonlyArray<Joker> = [
      createPlusFourMultJoker(),
      createBusinessCardJoker(),
    ];
    expect(resolveTemperancePayout(jokers, 3)).toBe(3);
  });
});

describe("The Hanged Man", () => {
  test("the-hanged-man is in the catalog", () => {
    expect(tarotById("the-hanged-man").name).toBe("The Hanged Man");
  });

  test("the-hanged-man effect kind is destroy-selected", () => {
    expect(tarotById("the-hanged-man").effect.kind).toBe("destroy-selected");
  });

  test("the-hanged-man targets up to 2 cards (matches Balatro)", () => {
    expect(tarotById("the-hanged-man").effect).toEqual({
      kind: "destroy-selected",
      maxTargets: 2,
    });
  });

  test("the-hanged-man description names destruction and up to 2 cards", () => {
    expect(tarotById("the-hanged-man").description).toBe(
      "Destroy up to 2 cards in hand",
    );
  });
});

describe("Strength", () => {
  test("strength is in the catalog", () => {
    expect(tarotById("strength").name).toBe("Strength");
  });

  test("strength effect kind is rank-up-selected", () => {
    expect(tarotById("strength").effect.kind).toBe("rank-up-selected");
  });

  test("strength targets up to 2 cards (matches Balatro)", () => {
    expect(tarotById("strength").effect).toEqual({
      kind: "rank-up-selected",
      maxTargets: 2,
    });
  });

  test("strength description names rank increase", () => {
    expect(tarotById("strength").description).toBe(
      "Increase rank of up to 2 cards in hand by 1",
    );
  });
});

describe("nextRankUp", () => {
  test("advances 2 to 3", () => {
    expect(nextRankUp("2")).toBe("3");
  });

  test("advances 9 to 10", () => {
    expect(nextRankUp("9")).toBe("10");
  });

  test("advances 10 to J", () => {
    expect(nextRankUp("10")).toBe("J");
  });

  test("advances J to Q", () => {
    expect(nextRankUp("J")).toBe("Q");
  });

  test("advances Q to K", () => {
    expect(nextRankUp("Q")).toBe("K");
  });

  test("advances K to A (matches Balatro)", () => {
    expect(nextRankUp("K")).toBe("A");
  });

  test("wraps A back to 2 (matches Balatro)", () => {
    expect(nextRankUp("A")).toBe("2");
  });
});

describe("Wheel of Fortune", () => {
  test("wheel-of-fortune is in the catalog with the canonical name", () => {
    expect(tarotById("wheel-of-fortune").name).toBe("Wheel of Fortune");
  });

  test("wheel-of-fortune description names the 25% chance", () => {
    expect(tarotById("wheel-of-fortune").description).toMatch(/25%/);
  });

  test("wheel-of-fortune effect kind is edition-roll", () => {
    expect(tarotById("wheel-of-fortune").effect.kind).toBe("edition-roll");
  });
});

function fixedRng(values: ReadonlyArray<number>): RandomSource {
  let i = 0;
  return (): number => {
    const v = values[i % values.length];
    i += 1;
    return v;
  };
}

describe("rollWheelOfFortune", () => {
  const jokers: ReadonlyArray<Joker> = [
    createPlusFourMultJoker(),
    createBusinessCardJoker(),
  ];

  test("hit=true when the first roll is below the chance threshold", () => {
    const result = rollWheelOfFortune(jokers, 0.25, fixedRng([0.1, 0, 0]));
    expect(result.hit).toBe(true);
  });

  test("hit=false when the first roll is at or above the chance threshold", () => {
    const result = rollWheelOfFortune(jokers, 0.25, fixedRng([0.25, 0, 0]));
    expect(result.hit).toBe(false);
  });

  test("targetIdx is within the joker list bounds", () => {
    const result = rollWheelOfFortune(jokers, 0.25, fixedRng([0, 0.99, 0]));
    expect(result.targetIdx).toBeGreaterThanOrEqual(0);
    expect(result.targetIdx).toBeLessThan(jokers.length);
  });

  test("targetIdx is -1 when no jokers are equipped", () => {
    const result = rollWheelOfFortune([], 0.25, fixedRng([0, 0, 0]));
    expect(result.targetIdx).toBe(-1);
  });

  test("edition picks the first kind when the edition-roll lands at 0", () => {
    const result = rollWheelOfFortune(jokers, 0.25, fixedRng([0, 0, 0]));
    expect(result.edition).toBe(JOKER_EDITION_KINDS[0]);
  });

  test("edition picks the last kind when the edition-roll lands at 0.99", () => {
    const result = rollWheelOfFortune(jokers, 0.25, fixedRng([0, 0, 0.99]));
    expect(result.edition).toBe(JOKER_EDITION_KINDS[JOKER_EDITION_KINDS.length - 1]);
  });

  test("force100 override turns a missed roll into a hit (#354)", () => {
    chanceOverrideConfig.force100 = true;
    try {
      const result = rollWheelOfFortune(jokers, 0.25, fixedRng([0.99, 0, 0]));
      expect(result.hit).toBe(true);
    } finally {
      chanceOverrideConfig.force100 = false;
    }
  });
});

describe("suit-conversion tarots", () => {
  test("The Star converts to diamonds", () => {
    expect(tarotById("the-star").effect).toEqual({
      kind: "convert-suit",
      suit: "diamonds",
      maxTargets: 3,
    });
  });

  test("The Moon converts to clubs", () => {
    expect(tarotById("the-moon").effect).toEqual({
      kind: "convert-suit",
      suit: "clubs",
      maxTargets: 3,
    });
  });

  test("The Sun converts to hearts", () => {
    expect(tarotById("the-sun").effect).toEqual({
      kind: "convert-suit",
      suit: "hearts",
      maxTargets: 3,
    });
  });

  test("The World converts to spades", () => {
    expect(tarotById("the-world").effect).toEqual({
      kind: "convert-suit",
      suit: "spades",
      maxTargets: 3,
    });
  });

  test("The Star description names diamonds and up to 3 cards", () => {
    expect(tarotById("the-star").description).toBe(
      "Convert up to 3 cards in hand to ♦ Diamonds",
    );
  });

  test("The Moon description names clubs", () => {
    expect(tarotById("the-moon").description).toBe(
      "Convert up to 3 cards in hand to ♣ Clubs",
    );
  });

  test("The Sun description names hearts", () => {
    expect(tarotById("the-sun").description).toBe(
      "Convert up to 3 cards in hand to ♥ Hearts",
    );
  });

  test("The World description names spades", () => {
    expect(tarotById("the-world").description).toBe(
      "Convert up to 3 cards in hand to ♠ Spades",
    );
  });
});
