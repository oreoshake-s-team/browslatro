// @vitest-environment node
import { ENHANCEMENT_KINDS } from "../cards/enhancements";
import {
  HERMIT_MONEY_CAP,
  TAROT_BASE_PRICE,
  TEMPERANCE_MONEY_CAP,
  WHEEL_OF_FORTUNE_CHANCE,
  createTarotCatalog,
  resolveHermitPayout,
  resolveTemperancePayout,
  rollWheelOfFortune,
  type TarotCard,
} from "./tarots";
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

describe("TAROT_BASE_PRICE", () => {
  test("is three dollars (matches Balatro)", () => {
    expect(TAROT_BASE_PRICE).toBe(3);
  });
});

describe("HERMIT_MONEY_CAP", () => {
  test("is twenty dollars (matches Balatro)", () => {
    expect(HERMIT_MONEY_CAP).toBe(20);
  });
});

describe("createTarotCatalog", () => {
  test("contains eleven entries (eight apply-enhancement + Hermit + Temperance + Wheel of Fortune)", () => {
    expect(createTarotCatalog()).toHaveLength(11);
  });

  test("has unique ids", () => {
    const ids = createTarotCatalog().map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("every entry has a non-empty description", () => {
    const allDescribed = createTarotCatalog().every(
      (t) => t.description.length > 0,
    );
    expect(allDescribed).toBe(true);
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
  test("TEMPERANCE_MONEY_CAP is $50 (matches Balatro)", () => {
    expect(TEMPERANCE_MONEY_CAP).toBe(50);
  });

  test("temperance is in the catalog", () => {
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

describe("Wheel of Fortune", () => {
  test("WHEEL_OF_FORTUNE_CHANCE is 1/4 (matches Balatro)", () => {
    expect(WHEEL_OF_FORTUNE_CHANCE).toBe(0.25);
  });

  test("wheel-of-fortune is in the catalog", () => {
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
});
