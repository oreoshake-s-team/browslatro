// @vitest-environment node
import {
  BUSINESS_CARD_PROC_CHANCE,
  CLEVER_JOKER_CHIPS,
  CRAFTY_JOKER_CHIPS,
  CRAZY_JOKER_MULT,
  DEVIOUS_JOKER_CHIPS,
  DROLL_JOKER_MULT,
  JOKER_SELL_VALUE,
  JOLLY_JOKER_MULT,
  MAD_JOKER_MULT,
  MAX_JOKERS,
  RANK_PARITY,
  SLY_JOKER_CHIPS,
  SUIT_MULT_AMOUNT,
  WILY_JOKER_CHIPS,
  ZANY_JOKER_MULT,
  jokerSellValue,
  applyHandLevelJokers,
  applyJokersToScoring,
  applyPerCardJokers,
  computeFinalScoreWithJokers,
  createBusinessCardJoker,
  createCleverJoker,
  createCraftyJoker,
  createCrazyJoker,
  createDeviousJoker,
  createDrollJoker,
  createGluttonousJoker,
  createGreedyJoker,
  createJokerStencilJoker,
  createJollyJoker,
  createLustyJoker,
  createMadJoker,
  createJokerCatalog,
  createPlusFourMultJoker,
  createSlyJoker,
  createWilyJoker,
  createWrathfulJoker,
  createZanyJoker,
  initialJokersConfig,
  isFaceCard,
} from "./jokers";
import type { Card, Rank, Suit } from "../cards/types";

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

  test("JOKER_SELL_VALUE equals half the joker base price (floored)", () => {
    expect(JOKER_SELL_VALUE).toBe(2);
  });
});

describe("jokerSellValue", () => {
  test("returns JOKER_SELL_VALUE for any joker", () => {
    expect(jokerSellValue(createPlusFourMultJoker())).toBe(JOKER_SELL_VALUE);
  });
});

describe("Initial jokers (issue #223)", () => {
  test("initialJokersConfig.factory returns an empty array by default", () => {
    expect(initialJokersConfig.factory()).toEqual([]);
  });
});

describe("Default jokers", () => {
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

describe("applyHandLevelJokers — fired ids", () => {
  test("reports the +4 Mult joker as fired when equipped", () => {
    const result = applyHandLevelJokers([createPlusFourMultJoker()]);
    expect(result.firedJokerIds).toEqual(["plus-four-mult"]);
  });

  test("reports the Joker Stencil as fired at the hand-level pass (issue #225)", () => {
    const result = applyHandLevelJokers([createJokerStencilJoker()]);
    expect(result.firedJokerIds).toContain("joker-stencil");
  });

  test("multiplies xMult by empty-slot count at the hand-level pass when Stencil is equipped (issue #225)", () => {
    const result = applyHandLevelJokers([createJokerStencilJoker()]);
    expect(result.xMult).toBe(MAX_JOKERS - 1);
  });

  test("does not report Business Card as fired at the hand level", () => {
    const result = applyHandLevelJokers([createBusinessCardJoker()]);
    expect(result.firedJokerIds).toEqual([]);
  });
});

describe("applyHandLevelJokers — per-joker steps", () => {
  test("+4 Mult contributes a single additive-mult step (issue #192)", () => {
    const result = applyHandLevelJokers([createPlusFourMultJoker()]);
    expect(result.steps).toEqual([
      { jokerId: "plus-four-mult", jokerName: "+4 Mult", additiveMult: 4 },
    ]);
  });

  test("Devious Joker emits an additive-chips step when a Straight is played (issue #192)", () => {
    const result = applyHandLevelJokers([createDeviousJoker()], {
      playedHandLabel: "Straight",
    });
    expect(result.steps).toEqual([
      { jokerId: "devious-joker", jokerName: "Devious Joker", additiveChips: 100 },
    ]);
  });

  test("Devious Joker emits no step when no Straight is played", () => {
    const result = applyHandLevelJokers([createDeviousJoker()], {
      playedHandLabel: "High Card",
    });
    expect(result.steps).toEqual([]);
  });

  test("Jolly Joker emits no step when no Pair is played", () => {
    const result = applyHandLevelJokers([createJollyJoker()], {
      playedHandLabel: "High Card",
    });
    expect(result.steps).toEqual([]);
  });

  test("steps preserve left-to-right joker order", () => {
    const result = applyHandLevelJokers(
      [createDeviousJoker(), createPlusFourMultJoker()],
      { playedHandLabel: "Straight" },
    );
    expect(result.steps.map((s) => s.jokerId)).toEqual([
      "devious-joker",
      "plus-four-mult",
    ]);
  });

  test("Joker Stencil emits an xMultFactor step at the hand-level pass (issue #225)", () => {
    const result = applyHandLevelJokers([createJokerStencilJoker()]);
    expect(result.steps).toEqual([
      {
        jokerId: "joker-stencil",
        jokerName: "Joker Stencil",
        xMultFactor: MAX_JOKERS - 1,
      },
    ]);
  });
});

describe("applyPerCardJokers", () => {
  test("reports Business Card as fired when a face card procs", () => {
    const rng = (): number => 0;
    const result = applyPerCardJokers(
      [createBusinessCardJoker()],
      card("J"),
      rng,
    );
    expect(result.firedJokerIds).toEqual(["business-card"]);
  });

  test("does not report Business Card as fired when the roll fails", () => {
    const rng = (): number => 0.99;
    const result = applyPerCardJokers(
      [createBusinessCardJoker()],
      card("J"),
      rng,
    );
    expect(result.firedJokerIds).toEqual([]);
  });

  test("does not report Business Card as fired on a non-face card", () => {
    const rng = (): number => 0;
    const result = applyPerCardJokers(
      [createBusinessCardJoker()],
      card("5"),
      rng,
    );
    expect(result.firedJokerIds).toEqual([]);
  });

  test("returns $1 when Business Card procs on a face card", () => {
    const rng = (): number => 0;
    const result = applyPerCardJokers(
      [createBusinessCardJoker()],
      card("K"),
      rng,
    );
    expect(result.moneyEarned).toBe(1);
  });

  test("does not fire +4 Mult during a per-card pass", () => {
    const result = applyPerCardJokers([createPlusFourMultJoker()], card("J"));
    expect(result.firedJokerIds).toEqual([]);
  });
});

describe("Suit-conditional Mult jokers", () => {
  test("SUIT_MULT_AMOUNT equals 3", () => {
    expect(SUIT_MULT_AMOUNT).toBe(3);
  });

  test("Greedy Joker carries a per-suit-mult effect targeting diamonds", () => {
    expect(createGreedyJoker().effect).toEqual({
      kind: "per-suit-mult",
      suit: "diamonds",
      amount: SUIT_MULT_AMOUNT,
    });
  });

  test("Lusty Joker carries a per-suit-mult effect targeting hearts", () => {
    expect(createLustyJoker().effect).toEqual({
      kind: "per-suit-mult",
      suit: "hearts",
      amount: SUIT_MULT_AMOUNT,
    });
  });

  test("Wrathful Joker carries a per-suit-mult effect targeting spades", () => {
    expect(createWrathfulJoker().effect).toEqual({
      kind: "per-suit-mult",
      suit: "spades",
      amount: SUIT_MULT_AMOUNT,
    });
  });

  test("Gluttonous Joker carries a per-suit-mult effect targeting clubs", () => {
    expect(createGluttonousJoker().effect).toEqual({
      kind: "per-suit-mult",
      suit: "clubs",
      amount: SUIT_MULT_AMOUNT,
    });
  });
});

describe("applyJokersToScoring — Suit Mult aggregation", () => {
  test("sums per-card additive mult across scored cards matching the suit", () => {
    const scored = [card("2", "diamonds"), card("3", "diamonds"), card("4", "spades")];
    const result = applyJokersToScoring([createGreedyJoker()], scored);
    expect(result.additiveMult).toBe(SUIT_MULT_AMOUNT * 2);
  });

  test("combines hand-level and per-card additive mult contributions", () => {
    const scored = [card("2", "hearts"), card("3", "hearts")];
    const result = applyJokersToScoring(
      [createPlusFourMultJoker(), createLustyJoker()],
      scored,
    );
    expect(result.additiveMult).toBe(4 + SUIT_MULT_AMOUNT * 2);
  });
});

describe("Joker firing order respects input array order", () => {
  test("applyHandLevelJokers fired ids follow the input array order", () => {
    const a = createPlusFourMultJoker();
    const b = createPlusFourMultJoker();
    const result = applyHandLevelJokers([a, b]);
    expect(result.firedJokerIds).toEqual(["plus-four-mult", "plus-four-mult"]);
  });

  test("applyPerCardJokers fired ids follow the input array order", () => {
    const rng = (): number => 0;
    const result = applyPerCardJokers(
      [createBusinessCardJoker(), createGreedyJoker()],
      card("K", "diamonds"),
      rng,
    );
    expect(result.firedJokerIds).toEqual(["business-card", "greedy-joker"]);
  });

  test("applyPerCardJokers fired ids reflect a swapped input order", () => {
    const rng = (): number => 0;
    const result = applyPerCardJokers(
      [createGreedyJoker(), createBusinessCardJoker()],
      card("K", "diamonds"),
      rng,
    );
    expect(result.firedJokerIds).toEqual(["greedy-joker", "business-card"]);
  });
});

describe("computeFinalScoreWithJokers", () => {
  test("applies additive mult and xMult to base score", () => {
    const jokerResult = {
      additiveMult: 4,
      additiveChips: 0,
      xMult: 2,
      moneyEarned: 0,
    };
    expect(computeFinalScoreWithJokers(10, 1, 5, jokerResult)).toBe(150);
  });

  test("returns the floored integer score", () => {
    const jokerResult = {
      additiveMult: 0,
      additiveChips: 0,
      xMult: 1.5,
      moneyEarned: 0,
    };
    expect(computeFinalScoreWithJokers(10, 1, 0, jokerResult)).toBe(15);
  });

  test("matches the legacy formula when no joker effects are present", () => {
    const jokerResult = {
      additiveMult: 0,
      additiveChips: 0,
      xMult: 1,
      moneyEarned: 0,
    };
    expect(computeFinalScoreWithJokers(35, 4, 33, jokerResult)).toBe(272);
  });
});

describe("Hand-type Mult joker factories", () => {
  test("Jolly Joker requires a Pair and uses JOLLY_JOKER_MULT", () => {
    expect(createJollyJoker().effect).toEqual({
      kind: "on-hand-type-mult",
      requires: "Pair",
      amount: JOLLY_JOKER_MULT,
    });
  });

  test("Zany Joker requires Three of a Kind and uses ZANY_JOKER_MULT", () => {
    expect(createZanyJoker().effect).toEqual({
      kind: "on-hand-type-mult",
      requires: "Three of a Kind",
      amount: ZANY_JOKER_MULT,
    });
  });

  test("Mad Joker requires Two Pair and uses MAD_JOKER_MULT", () => {
    expect(createMadJoker().effect).toEqual({
      kind: "on-hand-type-mult",
      requires: "Two Pair",
      amount: MAD_JOKER_MULT,
    });
  });

  test("Crazy Joker requires a Straight and uses CRAZY_JOKER_MULT", () => {
    expect(createCrazyJoker().effect).toEqual({
      kind: "on-hand-type-mult",
      requires: "Straight",
      amount: CRAZY_JOKER_MULT,
    });
  });

  test("Droll Joker requires a Flush and uses DROLL_JOKER_MULT", () => {
    expect(createDrollJoker().effect).toEqual({
      kind: "on-hand-type-mult",
      requires: "Flush",
      amount: DROLL_JOKER_MULT,
    });
  });
});

describe("applyHandLevelJokers — hand-type containment composition", () => {
  test("Full House triggers Jolly (contains Pair) and Zany (contains 3oaK) but not Crazy (Straight)", () => {
    const result = applyHandLevelJokers(
      [createJollyJoker(), createZanyJoker(), createCrazyJoker()],
      { playedHandLabel: "Full House" },
    );
    expect(result.firedJokerIds).toEqual(["jolly-joker", "zany-joker"]);
  });

  test("Straight Flush triggers Crazy (Straight) and Droll (Flush)", () => {
    const result = applyHandLevelJokers(
      [createCrazyJoker(), createDrollJoker()],
      { playedHandLabel: "Straight Flush" },
    );
    expect(result.additiveMult).toBe(CRAZY_JOKER_MULT + DROLL_JOKER_MULT);
  });
});

describe("applyJokersToScoring — hand-type Mult threading", () => {
  test("threads playedHandLabel context into hand-level apply", () => {
    const result = applyJokersToScoring(
      [createJollyJoker()],
      [],
      Math.random,
      { playedHandLabel: "Two Pair" },
    );
    expect(result.additiveMult).toBe(JOLLY_JOKER_MULT);
  });

  test("does not fire hand-type Mult when context is omitted", () => {
    const result = applyJokersToScoring([createJollyJoker()], []);
    expect(result.additiveMult).toBe(0);
  });
});

describe("Stencil composition with prior mult (issue #131)", () => {
  test("hand-level additive mult is added before Stencil multiplies", () => {
    const result = applyJokersToScoring(
      [createPlusFourMultJoker(), createJokerStencilJoker()],
      [],
    );
    const emptySlots = MAX_JOKERS - 2;
    expect(result.additiveMult).toBe(4);
    expect(result.xMult).toBe(emptySlots);
  });

  test("computeFinalScoreWithJokers folds (additive) before (xMult)", () => {
    const emptySlots = MAX_JOKERS - 2;
    const finalScore = computeFinalScoreWithJokers(5, 1, 0, {
      additiveMult: 4,
      additiveChips: 0,
      xMult: emptySlots,
      moneyEarned: 0,
    });
    expect(finalScore).toBe(5 * (1 + 4) * emptySlots);
  });

  test("per-card additive mult from a suit joker also counts before Stencil multiplies", () => {
    const result = applyJokersToScoring(
      [createGreedyJoker(), createJokerStencilJoker()],
      [
        { id: 1, rank: "5", suit: "diamonds" },
        { id: 2, rank: "5", suit: "diamonds" },
      ],
    );
    const emptySlots = MAX_JOKERS - 2;
    expect(result.additiveMult).toBe(SUIT_MULT_AMOUNT * 2);
    expect(result.xMult).toBe(emptySlots);
  });
});

describe("Hand-type Chips joker factories", () => {
  test("Sly Joker requires a Pair and uses SLY_JOKER_CHIPS", () => {
    expect(createSlyJoker().effect).toEqual({
      kind: "on-hand-type-chips",
      requires: "Pair",
      amount: SLY_JOKER_CHIPS,
    });
  });

  test("Wily Joker requires Three of a Kind and uses WILY_JOKER_CHIPS", () => {
    expect(createWilyJoker().effect).toEqual({
      kind: "on-hand-type-chips",
      requires: "Three of a Kind",
      amount: WILY_JOKER_CHIPS,
    });
  });

  test("Clever Joker requires Two Pair and uses CLEVER_JOKER_CHIPS", () => {
    expect(createCleverJoker().effect).toEqual({
      kind: "on-hand-type-chips",
      requires: "Two Pair",
      amount: CLEVER_JOKER_CHIPS,
    });
  });

  test("Devious Joker requires a Straight and uses DEVIOUS_JOKER_CHIPS", () => {
    expect(createDeviousJoker().effect).toEqual({
      kind: "on-hand-type-chips",
      requires: "Straight",
      amount: DEVIOUS_JOKER_CHIPS,
    });
  });

  test("Crafty Joker requires a Flush and uses CRAFTY_JOKER_CHIPS", () => {
    expect(createCraftyJoker().effect).toEqual({
      kind: "on-hand-type-chips",
      requires: "Flush",
      amount: CRAFTY_JOKER_CHIPS,
    });
  });
});

describe("applyHandLevelJokers — hand-type Chips containment composition", () => {
  test("Flush House triggers Crafty (Flush) AND Sly (Pair)", () => {
    const result = applyHandLevelJokers(
      [createCraftyJoker(), createSlyJoker()],
      { playedHandLabel: "Flush House" },
    );
    expect(result.additiveChips).toBe(CRAFTY_JOKER_CHIPS + SLY_JOKER_CHIPS);
  });
});

describe("computeFinalScoreWithJokers — additive chips applied before mult", () => {
  test("folds jokerResult.additiveChips into chips total before multiplying", () => {
    const finalScore = computeFinalScoreWithJokers(10, 2, 5, {
      additiveMult: 3,
      additiveChips: 50,
      xMult: 2,
      moneyEarned: 0,
    });
    expect(finalScore).toBe((10 + 5 + 50) * (2 + 3) * 2);
  });
});

describe("RANK_PARITY", () => {
  test("classifies Ace as odd (Balatro canon)", () => {
    expect(RANK_PARITY.A).toBe("odd");
  });

  test("classifies 4 as even", () => {
    expect(RANK_PARITY["4"]).toBe("even");
  });

  test("classifies Jack as face (neither parity)", () => {
    expect(RANK_PARITY.J).toBe("face");
  });
});

describe("Face joker catalog membership", () => {
  test("Scary Face appears in the joker catalog", () => {
    const ids = createJokerCatalog().map((j) => j.id);
    expect(ids).toContain("scary-face");
  });

  test("Smiley Face appears in the joker catalog", () => {
    const ids = createJokerCatalog().map((j) => j.id);
    expect(ids).toContain("smiley-face");
  });

  test("Photograph appears in the joker catalog", () => {
    const ids = createJokerCatalog().map((j) => j.id);
    expect(ids).toContain("photograph");
  });
});
