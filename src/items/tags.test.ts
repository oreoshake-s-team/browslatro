// @vitest-environment node
import {
  INVESTMENT_TAG_REWARD,
  createTagCatalog,
  getTagSpec,
  resolveTagEffect,
  rollAnteSkipOffers,
  rollSkipTag,
  totalDeferredBossPayout,
  type TagEffect,
} from "./tags";

const KNOWN_CATEGORIES: ReadonlyArray<TagEffect["category"]> = [
  "deferred-boss-payout",
  "immediate",
  "next-shop",
];

describe("INVESTMENT_TAG_REWARD", () => {
  test("equals $25", () => {
    expect(INVESTMENT_TAG_REWARD).toBe(25);
  });
});

describe("Tag catalog", () => {
  test("includes the Investment tag", () => {
    const ids = createTagCatalog().map((t) => t.id);
    expect(ids).toContain("investment");
  });

  test("Investment tag has the canonical name", () => {
    expect(getTagSpec("investment").name).toBe("Investment Tag");
  });

  test("Investment tag description mentions the reward", () => {
    expect(getTagSpec("investment").description).toContain("$25");
  });

  test("every tag declares a known effect category", () => {
    const categories = createTagCatalog().map((t) => t.effect.category);
    expect(categories.every((c) => KNOWN_CATEGORIES.includes(c))).toBe(true);
  });
});

describe("D6 tag", () => {
  test("is included in the catalog", () => {
    expect(createTagCatalog().map((t) => t.id)).toContain("d6");
  });

  test("resolves to the next-shop category", () => {
    expect(resolveTagEffect("d6").category).toBe("next-shop");
  });

  test("carries a free-rerolls next-shop modifier", () => {
    const effect = resolveTagEffect("d6");
    if (effect.category !== "next-shop") {
      throw new Error("expected a next-shop effect");
    }
    expect(effect.modifiers).toEqual([{ kind: "free-rerolls" }]);
  });
});

describe("run-stat money tags", () => {
  test("Handy is included in the catalog", () => {
    expect(createTagCatalog().map((t) => t.id)).toContain("handy");
  });

  test("Garbage is included in the catalog", () => {
    expect(createTagCatalog().map((t) => t.id)).toContain("garbage");
  });

  test("Speed is included in the catalog", () => {
    expect(createTagCatalog().map((t) => t.id)).toContain("speed");
  });

  test("Handy resolves to an immediate $1-per-hand-played action", () => {
    const effect = resolveTagEffect("handy");
    if (effect.category !== "immediate") throw new Error("expected immediate");
    expect(effect.action).toEqual({
      kind: "money-per-stat",
      stat: "handsPlayed",
      perUnit: 1,
    });
  });

  test("Garbage resolves to an immediate $1-per-unused-discard action", () => {
    const effect = resolveTagEffect("garbage");
    if (effect.category !== "immediate") throw new Error("expected immediate");
    expect(effect.action).toEqual({
      kind: "money-per-stat",
      stat: "unusedDiscards",
      perUnit: 1,
    });
  });

  test("Speed resolves to an immediate $5-per-blind-skipped action", () => {
    const effect = resolveTagEffect("speed");
    if (effect.category !== "immediate") throw new Error("expected immediate");
    expect(effect.action).toEqual({
      kind: "money-per-stat",
      stat: "blindsSkipped",
      perUnit: 5,
    });
  });
});

describe("Economy tag", () => {
  test("is included in the catalog", () => {
    expect(createTagCatalog().map((t) => t.id)).toContain("economy");
  });

  test("resolves to an immediate double-money action capped at $40", () => {
    const effect = resolveTagEffect("economy");
    if (effect.category !== "immediate") throw new Error("expected immediate");
    expect(effect.action).toEqual({ kind: "double-money", cap: 40 });
  });
});

describe("resolveTagEffect", () => {
  test("Investment resolves to the deferred-boss-payout category", () => {
    expect(resolveTagEffect("investment").category).toBe("deferred-boss-payout");
  });

  test("Investment's deferred payout amount is $25", () => {
    const effect = resolveTagEffect("investment");
    if (effect.category !== "deferred-boss-payout") {
      throw new Error("expected a deferred-boss-payout effect");
    }
    expect(effect.amount).toBe(25);
  });
});

describe("totalDeferredBossPayout", () => {
  test("empty list sums to 0", () => {
    expect(totalDeferredBossPayout([])).toBe(0);
  });

  test("single Investment sums to $25", () => {
    expect(totalDeferredBossPayout(["investment"])).toBe(25);
  });

  test("two Investments sum to $50", () => {
    expect(totalDeferredBossPayout(["investment", "investment"])).toBe(50);
  });

  test("a non-deferred effect category contributes $0 to the boss payout", () => {
    const sumDeferred = (effects: ReadonlyArray<TagEffect>): number =>
      effects.reduce(
        (sum, e) => (e.category === "deferred-boss-payout" ? sum + e.amount : sum),
        0,
      );
    expect(
      sumDeferred([
        {
          category: "immediate",
          action: { kind: "money-per-stat", stat: "handsPlayed", perUnit: 1 },
        },
        { category: "next-shop", modifiers: [] },
      ]),
    ).toBe(0);
  });
});

describe("rollSkipTag", () => {
  test("returns a tag that exists in the catalog", () => {
    const ids = createTagCatalog().map((t) => t.id);
    expect(ids).toContain(rollSkipTag(() => 0));
  });

  test("a roll at the top of the range stays within the catalog bounds", () => {
    const ids = createTagCatalog().map((t) => t.id);
    expect(ids).toContain(rollSkipTag(() => 0.999999));
  });
});

describe("rollAnteSkipOffers", () => {
  test("rolls a small-blind offer from the catalog", () => {
    const ids = createTagCatalog().map((t) => t.id);
    expect(ids).toContain(rollAnteSkipOffers(() => 0).small);
  });

  test("rolls a big-blind offer from the catalog", () => {
    const ids = createTagCatalog().map((t) => t.id);
    expect(ids).toContain(rollAnteSkipOffers(() => 0).big);
  });
});
