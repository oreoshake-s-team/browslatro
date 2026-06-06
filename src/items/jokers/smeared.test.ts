// @vitest-environment node
import {
  ARROWHEAD_CHIPS,
  BLOODSTONE_X_MULT,
  ONYX_AGATE_MULT,
  ROUGH_GEM_MONEY,
  SUIT_MULT_AMOUNT,
  applyPerCardJokers,
  createArrowheadJoker,
  createBloodstoneJoker,
  createBusinessCardJoker,
  createGluttonousJoker,
  createGreedyJoker,
  createJokerCatalog,
  createLustyJoker,
  createOnyxAgateJoker,
  createRoughGemJoker,
  createSmearedJoker,
  createWrathfulJoker,
  handEvalOptionsFromJokers,
  type JokerRarity,
} from "../jokers";
import {
  detectHandLabel,
  mergedSuit,
} from "../../scoring/handEvaluator";
import type { Card, Rank, Suit } from "../../cards/types";

let nextId = 0;
function card(rank: Rank = "5", suit: Suit = "spades"): Card {
  return { id: ++nextId, rank, suit };
}

beforeEach(() => {
  nextId = 0;
});

describe("mergedSuit", () => {
  test("identity when smearedSuits is off (hearts)", () => {
    expect(mergedSuit("hearts", false)).toBe<Suit>("hearts");
  });

  test("identity when smearedSuits is off (spades)", () => {
    expect(mergedSuit("spades", false)).toBe<Suit>("spades");
  });

  test("identity when smearedSuits flag is omitted", () => {
    expect(mergedSuit("clubs")).toBe<Suit>("clubs");
  });

  test("hearts collapse to diamonds with smearedSuits", () => {
    expect(mergedSuit("hearts", true)).toBe<Suit>("diamonds");
  });

  test("diamonds stay as diamonds with smearedSuits", () => {
    expect(mergedSuit("diamonds", true)).toBe<Suit>("diamonds");
  });

  test("spades collapse to clubs with smearedSuits", () => {
    expect(mergedSuit("spades", true)).toBe<Suit>("clubs");
  });

  test("clubs stay as clubs with smearedSuits", () => {
    expect(mergedSuit("clubs", true)).toBe<Suit>("clubs");
  });
});

describe("Smeared Joker factory", () => {
  test("is an uncommon joker", () => {
    expect(createSmearedJoker().rarity).toBe<JokerRarity>("uncommon");
  });

  test("description mentions Hearts and Diamonds", () => {
    expect(createSmearedJoker().description).toMatch(/Hearts and Diamonds/);
  });

  test("description mentions Spades and Clubs", () => {
    expect(createSmearedJoker().description).toMatch(/Spades and Clubs/);
  });

  test("uses a passive-run-stats effect with smearedSuits", () => {
    expect(createSmearedJoker().effect).toEqual({
      kind: "passive-run-stats",
      smearedSuits: true,
    });
  });
});

describe("Smeared Joker in the catalog", () => {
  test("is registered with its id", () => {
    const ids = createJokerCatalog().map((j) => j.id);
    expect(ids).toContain("smeared");
  });

  test("the catalog entry has the correct rarity", () => {
    const entry = createJokerCatalog().find((j) => j.id === "smeared");
    expect(entry?.rarity).toBe<JokerRarity>("uncommon");
  });
});

describe("handEvalOptionsFromJokers", () => {
  test("derives smearedSuits when Smeared is equipped", () => {
    expect(handEvalOptionsFromJokers([createSmearedJoker()])).toEqual({
      smearedSuits: true,
    });
  });

  test("omits smearedSuits when an unrelated joker is equipped (negative)", () => {
    expect(handEvalOptionsFromJokers([createBusinessCardJoker()])).toEqual({});
  });
});

describe("detectHandLabel with Smeared Joker", () => {
  function cards(
    specs: ReadonlyArray<readonly [Rank, Suit]>,
  ): ReadonlyArray<Card> {
    return specs.map(([r, s]) => card(r, s));
  }

  const OPT = { smearedSuits: true } as const;

  test("5 Hearts + Diamonds mix is labeled Flush", () => {
    const hand = cards([
      ["2", "hearts"],
      ["6", "diamonds"],
      ["9", "hearts"],
      ["J", "diamonds"],
      ["K", "hearts"],
    ]);
    expect(detectHandLabel(hand, OPT)).toBe("Flush");
  });

  test("5 Spades + Clubs mix is labeled Flush", () => {
    const hand = cards([
      ["2", "spades"],
      ["6", "clubs"],
      ["9", "spades"],
      ["J", "clubs"],
      ["K", "spades"],
    ]);
    expect(detectHandLabel(hand, OPT)).toBe("Flush");
  });

  test("Hearts/Diamonds mixed with Spades is NOT a Flush", () => {
    const hand = cards([
      ["2", "hearts"],
      ["6", "diamonds"],
      ["9", "hearts"],
      ["J", "spades"],
      ["K", "diamonds"],
    ]);
    expect(detectHandLabel(hand, OPT)).toBe("High Card");
  });

  test("without Smeared, 5 mixed Hearts/Diamonds is NOT a Flush (negative)", () => {
    const hand = cards([
      ["2", "hearts"],
      ["6", "diamonds"],
      ["9", "hearts"],
      ["J", "diamonds"],
      ["K", "hearts"],
    ]);
    expect(detectHandLabel(hand)).toBe("High Card");
  });
});

describe("per-suit-mult jokers under Smeared", () => {
  const SMEARED_CTX = { smearedSuits: true } as const;

  test("Greedy (Diamonds bonus) also fires on a Heart with Smeared", () => {
    const result = applyPerCardJokers(
      [createGreedyJoker()],
      card("5", "hearts"),
      Math.random,
      SMEARED_CTX,
    );
    expect(result.additiveMult).toBe(SUIT_MULT_AMOUNT);
  });

  test("Lusty (Hearts bonus) also fires on a Diamond with Smeared", () => {
    const result = applyPerCardJokers(
      [createLustyJoker()],
      card("5", "diamonds"),
      Math.random,
      SMEARED_CTX,
    );
    expect(result.additiveMult).toBe(SUIT_MULT_AMOUNT);
  });

  test("Wrathful (Spades bonus) also fires on a Club with Smeared", () => {
    const result = applyPerCardJokers(
      [createWrathfulJoker()],
      card("5", "clubs"),
      Math.random,
      SMEARED_CTX,
    );
    expect(result.additiveMult).toBe(SUIT_MULT_AMOUNT);
  });

  test("Gluttonous (Clubs bonus) also fires on a Spade with Smeared", () => {
    const result = applyPerCardJokers(
      [createGluttonousJoker()],
      card("5", "spades"),
      Math.random,
      SMEARED_CTX,
    );
    expect(result.additiveMult).toBe(SUIT_MULT_AMOUNT);
  });

  test("without Smeared, Greedy does NOT fire on a Heart (negative)", () => {
    const result = applyPerCardJokers(
      [createGreedyJoker()],
      card("5", "hearts"),
    );
    expect(result.additiveMult).toBe(0);
  });

  test("Greedy still fires on a Diamond with Smeared (regression)", () => {
    const result = applyPerCardJokers(
      [createGreedyJoker()],
      card("5", "diamonds"),
      Math.random,
      SMEARED_CTX,
    );
    expect(result.additiveMult).toBe(SUIT_MULT_AMOUNT);
  });

  test("Greedy does NOT fire on a Spade with Smeared (cross-pair negative)", () => {
    const result = applyPerCardJokers(
      [createGreedyJoker()],
      card("5", "spades"),
      Math.random,
      SMEARED_CTX,
    );
    expect(result.additiveMult).toBe(0);
  });
});

describe("per-suit-chips/money/x-mult jokers under Smeared", () => {
  const SMEARED_CTX = { smearedSuits: true } as const;

  test("Onyx Agate (Clubs mult) fires on a Spade with Smeared", () => {
    const result = applyPerCardJokers(
      [createOnyxAgateJoker()],
      card("5", "spades"),
      Math.random,
      SMEARED_CTX,
    );
    expect(result.additiveMult).toBe(ONYX_AGATE_MULT);
  });

  test("Arrowhead (Spades chips) fires on a Club with Smeared", () => {
    const result = applyPerCardJokers(
      [createArrowheadJoker()],
      card("5", "clubs"),
      Math.random,
      SMEARED_CTX,
    );
    expect(result.additiveChips).toBe(ARROWHEAD_CHIPS);
  });

  test("Rough Gem (Diamonds money) fires on a Heart with Smeared", () => {
    const result = applyPerCardJokers(
      [createRoughGemJoker()],
      card("5", "hearts"),
      Math.random,
      SMEARED_CTX,
    );
    expect(result.moneyEarned).toBe(ROUGH_GEM_MONEY);
  });

  test("Bloodstone (Hearts X-mult chance) fires on a Diamond with Smeared when the roll succeeds", () => {
    const result = applyPerCardJokers(
      [createBloodstoneJoker()],
      card("5", "diamonds"),
      () => 0,
      SMEARED_CTX,
    );
    expect(result.xMult).toBe(BLOODSTONE_X_MULT);
  });

  test("without Smeared, Arrowhead does NOT fire on a Club (negative)", () => {
    const result = applyPerCardJokers(
      [createArrowheadJoker()],
      card("5", "clubs"),
    );
    expect(result.additiveChips).toBe(0);
  });

  test("without Smeared, Rough Gem does NOT fire on a Heart (negative)", () => {
    const result = applyPerCardJokers(
      [createRoughGemJoker()],
      card("5", "hearts"),
    );
    expect(result.moneyEarned).toBe(0);
  });
});
