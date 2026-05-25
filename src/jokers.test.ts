import {
  BUSINESS_CARD_PROC_CHANCE,
  MAX_JOKERS,
  SUIT_MULT_AMOUNT,
  applyHandLevelJokers,
  applyJokersToScoring,
  applyPerCardJokers,
  computeFinalScoreWithJokers,
  createBusinessCardJoker,
  createDefaultJokers,
  createGluttonousJoker,
  createGreedyJoker,
  createJokerStencilJoker,
  createLustyJoker,
  createPlusFourMultJoker,
  createWrathfulJoker,
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

  test("reports the Joker Stencil as fired when at least one slot is empty", () => {
    const result = applyHandLevelJokers([createJokerStencilJoker()]);
    expect(result.firedJokerIds).toEqual(["joker-stencil"]);
  });

  test("does not report the Joker Stencil as fired when all slots are filled", () => {
    const five = [
      createJokerStencilJoker(),
      createPlusFourMultJoker(),
      createPlusFourMultJoker(),
      createPlusFourMultJoker(),
      createPlusFourMultJoker(),
    ];
    const result = applyHandLevelJokers(five);
    expect(result.firedJokerIds).not.toContain("joker-stencil");
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

