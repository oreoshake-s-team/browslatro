// @vitest-environment node
import {
  INVESTMENT_TAG_REWARD,
  createTagCatalog,
  getTagSpec,
  resolveTagEffect,
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
    expect(sumDeferred([{ category: "immediate" }, { category: "next-shop" }])).toBe(0);
  });
});
