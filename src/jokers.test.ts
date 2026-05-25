import {
  BUSINESS_CARD_PROC_CHANCE,
  CLEVER_JOKER_CHIPS,
  CRAFTY_JOKER_CHIPS,
  CRAZY_JOKER_MULT,
  DEVIOUS_JOKER_CHIPS,
  DROLL_JOKER_MULT,
  JOLLY_JOKER_MULT,
  MAD_JOKER_MULT,
  MAX_JOKERS,
  SLY_JOKER_CHIPS,
  SUIT_MULT_AMOUNT,
  WILY_JOKER_CHIPS,
  ZANY_JOKER_MULT,
  applyHandLevelJokers,
  applyJokersToScoring,
  applyPerCardJokers,
  applyPostHandJokers,
  computeFinalScoreWithJokers,
  createBusinessCardJoker,
  createCleverJoker,
  createCraftyJoker,
  createCrazyJoker,
  createDefaultJokers,
  createDeviousJoker,
  createDrollJoker,
  createGluttonousJoker,
  createGreedyJoker,
  createJokerStencilJoker,
  createJollyJoker,
  createLustyJoker,
  createMadJoker,
  createPlusFourMultJoker,
  createSlyJoker,
  createWilyJoker,
  createWrathfulJoker,
  createZanyJoker,
  isFaceCard,
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

describe("applyHandLevelJokers — fired ids", () => {
  test("reports the +4 Mult joker as fired when equipped", () => {
    const result = applyHandLevelJokers([createPlusFourMultJoker()]);
    expect(result.firedJokerIds).toEqual(["plus-four-mult"]);
  });

  test("no longer reports the Joker Stencil at the hand-pre pass (issue #131 — moved to post-hand)", () => {
    const result = applyHandLevelJokers([createJokerStencilJoker()]);
    expect(result.firedJokerIds).not.toContain("joker-stencil");
  });

  test("does not multiply xMult at the hand-pre pass when Stencil is equipped (issue #131)", () => {
    const result = applyHandLevelJokers([createJokerStencilJoker()]);
    expect(result.xMult).toBe(1);
  });

  test("does not report Business Card as fired at the hand level", () => {
    const result = applyHandLevelJokers([createBusinessCardJoker()]);
    expect(result.firedJokerIds).toEqual([]);
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

describe("applyPerCardJokers — Greedy Joker", () => {
  test("adds SUIT_MULT_AMOUNT when scored card is a Diamond", () => {
    const result = applyPerCardJokers([createGreedyJoker()], card("5", "diamonds"));
    expect(result.additiveMult).toBe(SUIT_MULT_AMOUNT);
  });

  test("reports Greedy Joker as fired on a Diamond", () => {
    const result = applyPerCardJokers([createGreedyJoker()], card("5", "diamonds"));
    expect(result.firedJokerIds).toEqual(["greedy-joker"]);
  });

  test("does not add mult when scored card is not a Diamond", () => {
    const result = applyPerCardJokers([createGreedyJoker()], card("5", "spades"));
    expect(result.additiveMult).toBe(0);
  });

  test("does not fire on a non-Diamond card", () => {
    const result = applyPerCardJokers([createGreedyJoker()], card("5", "spades"));
    expect(result.firedJokerIds).toEqual([]);
  });
});

describe("applyPerCardJokers — Lusty Joker", () => {
  test("adds SUIT_MULT_AMOUNT when scored card is a Heart", () => {
    const result = applyPerCardJokers([createLustyJoker()], card("9", "hearts"));
    expect(result.additiveMult).toBe(SUIT_MULT_AMOUNT);
  });

  test("reports Lusty Joker as fired on a Heart", () => {
    const result = applyPerCardJokers([createLustyJoker()], card("9", "hearts"));
    expect(result.firedJokerIds).toEqual(["lusty-joker"]);
  });

  test("does not add mult when scored card is not a Heart", () => {
    const result = applyPerCardJokers([createLustyJoker()], card("9", "clubs"));
    expect(result.additiveMult).toBe(0);
  });

  test("does not fire on a non-Heart card", () => {
    const result = applyPerCardJokers([createLustyJoker()], card("9", "clubs"));
    expect(result.firedJokerIds).toEqual([]);
  });
});

describe("applyPerCardJokers — Wrathful Joker", () => {
  test("adds SUIT_MULT_AMOUNT when scored card is a Spade", () => {
    const result = applyPerCardJokers([createWrathfulJoker()], card("K", "spades"));
    expect(result.additiveMult).toBe(SUIT_MULT_AMOUNT);
  });

  test("reports Wrathful Joker as fired on a Spade", () => {
    const result = applyPerCardJokers([createWrathfulJoker()], card("K", "spades"));
    expect(result.firedJokerIds).toEqual(["wrathful-joker"]);
  });

  test("does not add mult when scored card is not a Spade", () => {
    const result = applyPerCardJokers([createWrathfulJoker()], card("K", "hearts"));
    expect(result.additiveMult).toBe(0);
  });

  test("does not fire on a non-Spade card", () => {
    const result = applyPerCardJokers([createWrathfulJoker()], card("K", "hearts"));
    expect(result.firedJokerIds).toEqual([]);
  });
});

describe("applyPerCardJokers — Gluttonous Joker", () => {
  test("adds SUIT_MULT_AMOUNT when scored card is a Club", () => {
    const result = applyPerCardJokers([createGluttonousJoker()], card("A", "clubs"));
    expect(result.additiveMult).toBe(SUIT_MULT_AMOUNT);
  });

  test("reports Gluttonous Joker as fired on a Club", () => {
    const result = applyPerCardJokers([createGluttonousJoker()], card("A", "clubs"));
    expect(result.firedJokerIds).toEqual(["gluttonous-joker"]);
  });

  test("does not add mult when scored card is not a Club", () => {
    const result = applyPerCardJokers([createGluttonousJoker()], card("A", "diamonds"));
    expect(result.additiveMult).toBe(0);
  });

  test("does not fire on a non-Club card", () => {
    const result = applyPerCardJokers([createGluttonousJoker()], card("A", "diamonds"));
    expect(result.firedJokerIds).toEqual([]);
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

describe("applyHandLevelJokers — Jolly Joker", () => {
  test("adds JOLLY_JOKER_MULT when played hand contains a Pair", () => {
    const result = applyHandLevelJokers([createJollyJoker()], {
      playedHandLabel: "Pair",
    });
    expect(result.additiveMult).toBe(JOLLY_JOKER_MULT);
  });

  test("reports Jolly Joker as fired on a Pair", () => {
    const result = applyHandLevelJokers([createJollyJoker()], {
      playedHandLabel: "Pair",
    });
    expect(result.firedJokerIds).toEqual(["jolly-joker"]);
  });

  test("does not add mult when played hand does not contain a Pair", () => {
    const result = applyHandLevelJokers([createJollyJoker()], {
      playedHandLabel: "High Card",
    });
    expect(result.additiveMult).toBe(0);
  });

  test("does not fire when no played hand label is provided", () => {
    const result = applyHandLevelJokers([createJollyJoker()]);
    expect(result.firedJokerIds).toEqual([]);
  });
});

describe("applyHandLevelJokers — Zany Joker", () => {
  test("adds ZANY_JOKER_MULT when played hand contains Three of a Kind", () => {
    const result = applyHandLevelJokers([createZanyJoker()], {
      playedHandLabel: "Three of a Kind",
    });
    expect(result.additiveMult).toBe(ZANY_JOKER_MULT);
  });

  test("does not fire on a Pair (does not contain Three of a Kind)", () => {
    const result = applyHandLevelJokers([createZanyJoker()], {
      playedHandLabel: "Pair",
    });
    expect(result.firedJokerIds).toEqual([]);
  });
});

describe("applyHandLevelJokers — Mad Joker", () => {
  test("adds MAD_JOKER_MULT when played hand contains Two Pair", () => {
    const result = applyHandLevelJokers([createMadJoker()], {
      playedHandLabel: "Two Pair",
    });
    expect(result.additiveMult).toBe(MAD_JOKER_MULT);
  });

  test("does not fire on a single Pair", () => {
    const result = applyHandLevelJokers([createMadJoker()], {
      playedHandLabel: "Pair",
    });
    expect(result.firedJokerIds).toEqual([]);
  });
});

describe("applyHandLevelJokers — Crazy Joker", () => {
  test("adds CRAZY_JOKER_MULT when played hand contains a Straight", () => {
    const result = applyHandLevelJokers([createCrazyJoker()], {
      playedHandLabel: "Straight",
    });
    expect(result.additiveMult).toBe(CRAZY_JOKER_MULT);
  });

  test("does not fire on a Flush (Flush does not contain Straight)", () => {
    const result = applyHandLevelJokers([createCrazyJoker()], {
      playedHandLabel: "Flush",
    });
    expect(result.firedJokerIds).toEqual([]);
  });
});

describe("applyHandLevelJokers — Droll Joker", () => {
  test("adds DROLL_JOKER_MULT when played hand contains a Flush", () => {
    const result = applyHandLevelJokers([createDrollJoker()], {
      playedHandLabel: "Flush",
    });
    expect(result.additiveMult).toBe(DROLL_JOKER_MULT);
  });

  test("does not fire on a Straight (Straight does not contain Flush)", () => {
    const result = applyHandLevelJokers([createDrollJoker()], {
      playedHandLabel: "Straight",
    });
    expect(result.firedJokerIds).toEqual([]);
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

describe("applyPostHandJokers — Joker Stencil (issue #131)", () => {
  test("multiplies xMult by empty-slot count when only Stencil is equipped", () => {
    const result = applyPostHandJokers([createJokerStencilJoker()]);
    expect(result.xMult).toBe(MAX_JOKERS - 1);
  });

  test("reports Stencil as fired when at least one slot is empty", () => {
    const result = applyPostHandJokers([createJokerStencilJoker()]);
    expect(result.firedJokerIds).toEqual(["joker-stencil"]);
  });

  test("emits one step per fired Stencil with xMultFactor = emptySlots", () => {
    const result = applyPostHandJokers([createJokerStencilJoker()]);
    expect(result.steps).toEqual([
      { jokerId: "joker-stencil", xMultFactor: MAX_JOKERS - 1 },
    ]);
  });

  test("does NOT fire when all 5 slots are filled (existing behavior preserved)", () => {
    const stencil = createJokerStencilJoker();
    const result = applyPostHandJokers([
      stencil,
      createPlusFourMultJoker(),
      createPlusFourMultJoker(),
      createPlusFourMultJoker(),
      createPlusFourMultJoker(),
    ]);
    expect(result.firedJokerIds).toEqual([]);
  });

  test("returns xMult=1 when Stencil does not fire", () => {
    const stencil = createJokerStencilJoker();
    const result = applyPostHandJokers([
      stencil,
      createPlusFourMultJoker(),
      createPlusFourMultJoker(),
      createPlusFourMultJoker(),
      createPlusFourMultJoker(),
    ]);
    expect(result.xMult).toBe(1);
  });

  test("returns no steps when Stencil does not fire", () => {
    const stencil = createJokerStencilJoker();
    const result = applyPostHandJokers([
      stencil,
      createPlusFourMultJoker(),
      createPlusFourMultJoker(),
      createPlusFourMultJoker(),
      createPlusFourMultJoker(),
    ]);
    expect(result.steps).toEqual([]);
  });

  test("ignores hand-pre and per-card jokers (only post-hand jokers fire here)", () => {
    const result = applyPostHandJokers([
      createPlusFourMultJoker(),
      createBusinessCardJoker(),
      createGreedyJoker(),
      createJollyJoker(),
    ]);
    expect(result.firedJokerIds).toEqual([]);
  });

  test("walks the joker row left → right and emits steps in array order", () => {
    const a = createJokerStencilJoker();
    const b = createJokerStencilJoker();
    const result = applyPostHandJokers([a, b]);
    expect(result.steps.map((s) => s.jokerId)).toEqual([
      "joker-stencil",
      "joker-stencil",
    ]);
  });

  test("two Stencils equipped multiply their xMult contributions", () => {
    const result = applyPostHandJokers([
      createJokerStencilJoker(),
      createJokerStencilJoker(),
    ]);
    const emptySlots = MAX_JOKERS - 2;
    expect(result.xMult).toBe(emptySlots * emptySlots);
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

describe("applyHandLevelJokers — Sly Joker", () => {
  test("adds SLY_JOKER_CHIPS when played hand contains a Pair", () => {
    const result = applyHandLevelJokers([createSlyJoker()], {
      playedHandLabel: "Pair",
    });
    expect(result.additiveChips).toBe(SLY_JOKER_CHIPS);
  });

  test("does not add chips when played hand does not contain a Pair", () => {
    const result = applyHandLevelJokers([createSlyJoker()], {
      playedHandLabel: "High Card",
    });
    expect(result.additiveChips).toBe(0);
  });
});

describe("applyHandLevelJokers — Wily Joker", () => {
  test("adds WILY_JOKER_CHIPS when played hand contains Three of a Kind", () => {
    const result = applyHandLevelJokers([createWilyJoker()], {
      playedHandLabel: "Three of a Kind",
    });
    expect(result.additiveChips).toBe(WILY_JOKER_CHIPS);
  });

  test("does not fire on a Pair (does not contain Three of a Kind)", () => {
    const result = applyHandLevelJokers([createWilyJoker()], {
      playedHandLabel: "Pair",
    });
    expect(result.additiveChips).toBe(0);
  });
});

describe("applyHandLevelJokers — Clever Joker", () => {
  test("adds CLEVER_JOKER_CHIPS when played hand contains Two Pair", () => {
    const result = applyHandLevelJokers([createCleverJoker()], {
      playedHandLabel: "Two Pair",
    });
    expect(result.additiveChips).toBe(CLEVER_JOKER_CHIPS);
  });

  test("does not fire on a single Pair", () => {
    const result = applyHandLevelJokers([createCleverJoker()], {
      playedHandLabel: "Pair",
    });
    expect(result.additiveChips).toBe(0);
  });
});

describe("applyHandLevelJokers — Devious Joker", () => {
  test("adds DEVIOUS_JOKER_CHIPS when played hand contains a Straight", () => {
    const result = applyHandLevelJokers([createDeviousJoker()], {
      playedHandLabel: "Straight",
    });
    expect(result.additiveChips).toBe(DEVIOUS_JOKER_CHIPS);
  });

  test("does not fire on a Flush (Flush does not contain Straight)", () => {
    const result = applyHandLevelJokers([createDeviousJoker()], {
      playedHandLabel: "Flush",
    });
    expect(result.additiveChips).toBe(0);
  });
});

describe("applyHandLevelJokers — Crafty Joker", () => {
  test("adds CRAFTY_JOKER_CHIPS when played hand contains a Flush", () => {
    const result = applyHandLevelJokers([createCraftyJoker()], {
      playedHandLabel: "Flush",
    });
    expect(result.additiveChips).toBe(CRAFTY_JOKER_CHIPS);
  });

  test("does not fire on a Straight (Straight does not contain Flush)", () => {
    const result = applyHandLevelJokers([createCraftyJoker()], {
      playedHandLabel: "Straight",
    });
    expect(result.additiveChips).toBe(0);
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
