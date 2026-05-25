import {
  BUSINESS_CARD_PROC_CHANCE,
  MAX_JOKERS,
  SHOP_JOKER_POOL,
  applyJokersToScoring,
  cloneJokerWithFreshId,
  computeFinalScoreWithJokers,
  createBusinessCardJoker,
  createDefaultJokers,
  createJokerStencilJoker,
  createPlusFourMultJoker,
  isFaceCard,
  sampleShopJokers,
} from "./jokers";
import type { Card, Rank, Suit } from "./types";

let nextId = 0;
function card(rank: Rank, suit: Suit = "spades"): Card {
  return { id: ++nextId, rank, suit };
}

beforeEach(() => {
  nextId = 0;
});

describe("Constants", () => {
  test("MAX_JOKERS equals 5", () => {
    expect(MAX_JOKERS).toBe(5);
  });

  test("BUSINESS_CARD_PROC_CHANCE equals 0.5", () => {
    expect(BUSINESS_CARD_PROC_CHANCE).toBe(0.5);
  });
});

describe("Default jokers", () => {
  test("createDefaultJokers returns three jokers", () => {
    expect(createDefaultJokers()).toHaveLength(3);
  });

  test("default jokers include the +4 Mult joker", () => {
    expect(createDefaultJokers().map((j) => j.id)).toContain("plus-four-mult");
  });

  test("default jokers include the Business Card joker", () => {
    expect(createDefaultJokers().map((j) => j.id)).toContain("business-card");
  });

  test("default jokers include the Joker Stencil joker", () => {
    expect(createDefaultJokers().map((j) => j.id)).toContain("joker-stencil");
  });

  test("+4 Mult joker carries an additive amount of 4", () => {
    const joker = createPlusFourMultJoker();
    expect(joker.effect).toEqual({ kind: "additive-mult", amount: 4 });
  });

  test("Business Card joker carries chance equal to BUSINESS_CARD_PROC_CHANCE", () => {
    const joker = createBusinessCardJoker();
    expect(joker.effect).toEqual({
      kind: "business-card",
      chance: BUSINESS_CARD_PROC_CHANCE,
      payout: 1,
    });
  });

  test("Joker Stencil joker has stencil effect kind", () => {
    expect(createJokerStencilJoker().effect.kind).toBe("stencil");
  });
});

describe("isFaceCard", () => {
  test("recognizes a Jack as a face card", () => {
    expect(isFaceCard(card("J"))).toBe(true);
  });

  test("recognizes a Queen as a face card", () => {
    expect(isFaceCard(card("Q"))).toBe(true);
  });

  test("recognizes a King as a face card", () => {
    expect(isFaceCard(card("K"))).toBe(true);
  });

  test("does not recognize an Ace as a face card", () => {
    expect(isFaceCard(card("A"))).toBe(false);
  });

  test("does not recognize a number card as a face card", () => {
    expect(isFaceCard(card("5"))).toBe(false);
  });
});

describe("applyJokersToScoring — +4 Mult joker", () => {
  test("adds 4 to the additive mult", () => {
    const result = applyJokersToScoring([createPlusFourMultJoker()], []);
    expect(result.additiveMult).toBe(4);
  });

  test("does not change xMult", () => {
    const result = applyJokersToScoring([createPlusFourMultJoker()], []);
    expect(result.xMult).toBe(1);
  });

  test("does not award any money", () => {
    const result = applyJokersToScoring([createPlusFourMultJoker()], []);
    expect(result.moneyEarned).toBe(0);
  });
});

describe("applyJokersToScoring — Business Card joker", () => {
  test("awards $1 per face card when every roll procs", () => {
    const rng = (): number => 0;
    const scored = [card("J"), card("Q"), card("K")];
    const result = applyJokersToScoring([createBusinessCardJoker()], scored, rng);
    expect(result.moneyEarned).toBe(3);
  });

  test("awards $0 when no rolls proc", () => {
    const rng = (): number => 0.99;
    const scored = [card("J"), card("Q"), card("K")];
    const result = applyJokersToScoring([createBusinessCardJoker()], scored, rng);
    expect(result.moneyEarned).toBe(0);
  });

  test("ignores non-face cards even when rolls would proc", () => {
    const rng = (): number => 0;
    const scored = [card("2"), card("5"), card("A")];
    const result = applyJokersToScoring([createBusinessCardJoker()], scored, rng);
    expect(result.moneyEarned).toBe(0);
  });

  test("rolls independently per face card using the provided RNG sequence", () => {
    const rolls = [0.1, 0.9, 0.1];
    let i = 0;
    const rng = (): number => {
      const value = rolls[i];
      i += 1;
      return value;
    };
    const scored = [card("J"), card("Q"), card("K")];
    const result = applyJokersToScoring([createBusinessCardJoker()], scored, rng);
    expect(result.moneyEarned).toBe(2);
  });

  test("does not change mult", () => {
    const rng = (): number => 0;
    const scored = [card("J")];
    const result = applyJokersToScoring([createBusinessCardJoker()], scored, rng);
    expect(result.additiveMult).toBe(0);
  });
});

describe("applyJokersToScoring — Joker Stencil", () => {
  test("contributes xMult equal to empty slot count when only Stencil is equipped", () => {
    const result = applyJokersToScoring([createJokerStencilJoker()], []);
    expect(result.xMult).toBe(MAX_JOKERS - 1);
  });

  test("contributes xMult equal to 2 when 3 jokers are equipped", () => {
    const jokers = [
      createPlusFourMultJoker(),
      createBusinessCardJoker(),
      createJokerStencilJoker(),
    ];
    const result = applyJokersToScoring(jokers, []);
    expect(result.xMult).toBe(MAX_JOKERS - jokers.length);
  });

  test("is a no-op (xMult stays at 1) when all 5 slots are filled", () => {
    const stencil = createJokerStencilJoker();
    const jokers = [
      stencil,
      createPlusFourMultJoker(),
      createPlusFourMultJoker(),
      createPlusFourMultJoker(),
      createPlusFourMultJoker(),
    ];
    const result = applyJokersToScoring(jokers, []);
    expect(result.xMult).toBe(1);
  });
});

describe("computeFinalScoreWithJokers", () => {
  test("applies additive mult and xMult to base score", () => {
    const jokerResult = { additiveMult: 4, xMult: 2, moneyEarned: 0 };
    expect(computeFinalScoreWithJokers(10, 1, 5, jokerResult)).toBe(150);
  });

  test("returns the floored integer score", () => {
    const jokerResult = { additiveMult: 0, xMult: 1.5, moneyEarned: 0 };
    expect(computeFinalScoreWithJokers(10, 1, 0, jokerResult)).toBe(15);
  });

  test("matches the legacy formula when no joker effects are present", () => {
    const jokerResult = { additiveMult: 0, xMult: 1, moneyEarned: 0 };
    expect(computeFinalScoreWithJokers(35, 4, 33, jokerResult)).toBe(272);
  });
});

describe("cloneJokerWithFreshId", () => {
  test("preserves the joker's effect", () => {
    const original = createPlusFourMultJoker();
    const clone = cloneJokerWithFreshId(original);
    expect(clone.effect).toEqual(original.effect);
  });

  test("mints a new id distinct from the original template", () => {
    const original = createPlusFourMultJoker();
    const clone = cloneJokerWithFreshId(original);
    expect(clone.id).not.toBe(original.id);
  });

  test("mints a unique id for every clone of the same template", () => {
    const a = cloneJokerWithFreshId(createPlusFourMultJoker());
    const b = cloneJokerWithFreshId(createPlusFourMultJoker());
    expect(a.id).not.toBe(b.id);
  });
});

describe("sampleShopJokers", () => {
  test("returns the requested number of offers", () => {
    expect(sampleShopJokers(2, () => 0)).toHaveLength(2);
  });

  test("returns jokers drawn from the shop pool", () => {
    const offers = sampleShopJokers(2, () => 0);
    // rng=0 → idx 0 → first pool entry every time → name matches first factory.
    const expectedName = SHOP_JOKER_POOL[0]().name;
    expect(offers.every((j) => j.name === expectedName)).toBe(true);
  });

  test("allows duplicate templates across the returned offers", () => {
    const offers = sampleShopJokers(2, () => 0);
    expect(offers[0].name).toBe(offers[1].name);
  });

  test("gives duplicate offers distinct instance ids so React keys do not collide", () => {
    const offers = sampleShopJokers(2, () => 0);
    expect(offers[0].id).not.toBe(offers[1].id);
  });

  test("returns an empty array when count is zero", () => {
    expect(sampleShopJokers(0, () => 0)).toEqual([]);
  });
});
