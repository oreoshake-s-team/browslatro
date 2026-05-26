// @vitest-environment node
import { ENHANCEMENT_KINDS } from "./enhancements";
import {
  HERMIT_MONEY_CAP,
  TAROT_BASE_PRICE,
  createTarotCatalog,
  resolveHermitPayout,
  type TarotCard,
} from "./tarots";

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
  test("contains nine entries (first-cut scope)", () => {
    expect(createTarotCatalog()).toHaveLength(9);
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
