// @vitest-environment node
import { describe, expect, test } from "vitest";
import { simulatePlay } from "./simulatePlay";
import { boss, card, joker, simulateInput as input } from "./test-helpers";
import {
  createBaronJoker,
  createGreenJokerJoker,
  createRunnerJoker,
  createSpareTrousersJoker,
  FOIL_CHIPS,
  GREEN_JOKER_MULT_PER_HAND,
  HOLOGRAPHIC_MULT,
  POLYCHROME_X_MULT,
  RUNNER_CHIPS_PER_STRAIGHT,
  SPARE_TROUSERS_MULT_PER_TWO_PAIR,
} from "../items/jokers";

describe("simulatePlay — legality", () => {
  test("rejects an empty selection", () => {
    expect(simulatePlay(input([card("A", "spades")]), [])).toEqual({
      legal: false,
      reason: "empty-selection",
    });
  });

  test("rejects more than five cards", () => {
    const hand = [
      card("2", "clubs"),
      card("3", "clubs"),
      card("4", "clubs"),
      card("5", "clubs"),
      card("6", "clubs"),
      card("7", "clubs"),
    ];
    expect(simulatePlay(input(hand), hand.map((c) => c.id))).toEqual({
      legal: false,
      reason: "too-many-cards",
    });
  });

  test("rejects ids that are not in the current hand", () => {
    expect(simulatePlay(input([card("A", "spades")]), [99999])).toEqual({
      legal: false,
      reason: "card-not-in-hand",
    });
  });

  test("a hand voided by The Mouth is legal but scores 0", () => {
    const c = card("A", "spades");
    const result = simulatePlay(
      input([c], {
        blind: 3,
        currentBoss: boss({ effect: { kind: "single-hand-type" } }),
        handHistoryThisRound: ["Pair"],
      }),
      [c.id],
    );
    expect(result).toEqual({
      legal: true,
      handLabel: "High Card",
      score: 0,
      chips: 0,
      mult: 0,
      scoringCardIds: [],
      bossTriggered: true,
    });
  });

  test("a hand repeated under The Eye is legal but scores 0", () => {
    const pair = [card("9", "hearts"), card("9", "spades")];
    const result = simulatePlay(
      input(pair, {
        blind: 3,
        currentBoss: boss({ effect: { kind: "no-repeat-hand-type" } }),
        handHistoryThisRound: ["Pair"],
      }),
      pair.map((c) => c.id),
    );
    expect(result).toMatchObject({ legal: true, score: 0, bossTriggered: true });
  });
});

describe("simulatePlay — base scoring", () => {
  test("scores a pair of nines at level 1", () => {
    const nines = [card("9", "hearts"), card("9", "spades")];
    const result = simulatePlay(input(nines), nines.map((c) => c.id));
    expect(result).toMatchObject({ legal: true, handLabel: "Pair", score: 56 });
  });

  test("kickers do not contribute chips", () => {
    const cards = [card("9", "hearts"), card("9", "spades"), card("2", "clubs")];
    const result = simulatePlay(input(cards), cards.map((c) => c.id));
    expect(result).toMatchObject({ legal: true, score: 56 });
  });

  test("reports only scoring card ids", () => {
    const pair = [card("9", "hearts"), card("9", "spades")];
    const kicker = card("2", "clubs");
    const result = simulatePlay(input([...pair, kicker]), [
      ...pair.map((c) => c.id),
      kicker.id,
    ]);
    expect(result.legal && result.scoringCardIds).toEqual(pair.map((c) => c.id));
  });

  test("an additive-mult joker raises the multiplier", () => {
    const nines = [card("9", "hearts"), card("9", "spades")];
    const result = simulatePlay(
      input(nines, { jokers: [joker()] }),
      nines.map((c) => c.id),
    );
    expect(result.legal && result.score).toBe(168);
  });

  test("a red seal retriggers the card's chips", () => {
    const ace = card("A", "spades", { seal: "red" });
    const result = simulatePlay(input([ace]), [ace.id]);
    expect(result.legal && result.score).toBe(27);
  });

  test("a glass card doubles the multiplier", () => {
    const ace = card("A", "spades", { enhancement: "glass" });
    const result = simulatePlay(input([ace]), [ace.id]);
    expect(result.legal && result.score).toBe(32);
  });

  test("a steel card held in hand multiplies by 1.5", () => {
    const ace = card("A", "spades");
    const steel = card("2", "clubs", { enhancement: "steel" });
    const result = simulatePlay(input([ace, steel]), [ace.id]);
    expect(result.legal && result.score).toBe(24);
  });

  test("a lucky card never procs in simulation", () => {
    const plain = card("A", "spades");
    const lucky = card("A", "hearts", { enhancement: "lucky" });
    const plainScore = simulatePlay(input([plain]), [plain.id]);
    const luckyScore = simulatePlay(input([lucky]), [lucky.id]);
    expect(plainScore.legal && luckyScore.legal && luckyScore.score).toBe(
      plainScore.legal && plainScore.score,
    );
  });
});

describe("simulatePlay — card editions", () => {
  const chipsOf = (r: ReturnType<typeof simulatePlay>): number =>
    r.legal ? r.chips : 0;
  const multOf = (r: ReturnType<typeof simulatePlay>): number =>
    r.legal ? r.mult : 0;

  test("a foil card adds chips when scored", () => {
    const plain = card("A", "spades");
    const foil = card("A", "spades", { edition: "foil" });
    const base = simulatePlay(input([plain]), [plain.id]);
    const result = simulatePlay(input([foil]), [foil.id]);
    expect(chipsOf(result) - chipsOf(base)).toBe(FOIL_CHIPS);
  });

  test("a holographic card adds mult when scored", () => {
    const plain = card("A", "spades");
    const holo = card("A", "spades", { edition: "holographic" });
    const base = simulatePlay(input([plain]), [plain.id]);
    const result = simulatePlay(input([holo]), [holo.id]);
    expect(multOf(result) - multOf(base)).toBe(HOLOGRAPHIC_MULT);
  });

  test("a polychrome card multiplies the mult when scored", () => {
    const plain = card("A", "spades");
    const poly = card("A", "spades", { edition: "polychrome" });
    const base = simulatePlay(input([plain]), [plain.id]);
    const result = simulatePlay(input([poly]), [poly.id]);
    expect(multOf(result)).toBe(multOf(base) * POLYCHROME_X_MULT);
  });

  test("a plain card has no edition contribution (negative)", () => {
    const plain = card("A", "spades");
    const base = simulatePlay(input([plain]), [plain.id]);
    const again = simulatePlay(input([plain]), [plain.id]);
    expect(chipsOf(again)).toBe(chipsOf(base));
  });
});

describe("simulatePlay — boss effects", () => {
  test("a forced-card-count boss zeroes a wrong-sized hand", () => {
    const ace = card("A", "spades");
    const result = simulatePlay(
      input([ace], {
        blind: 3,
        currentBoss: boss({ effect: { kind: "force-card-count", value: 5 } }),
      }),
      [ace.id],
    );
    expect(result.legal && result.score).toBe(0);
  });

  test("a suit-debuff boss removes the card from scoring", () => {
    const heart = card("A", "hearts");
    const result = simulatePlay(
      input([heart], {
        blind: 3,
        currentBoss: boss({ effect: { kind: "debuff-suit", suit: "hearts" } }),
      }),
      [heart.id],
    );
    expect(result.legal && result.score).toBe(5);
  });

  test("boss debuffs do not apply outside the boss round", () => {
    const heart = card("A", "hearts");
    const result = simulatePlay(
      input([heart], {
        blind: 1,
        currentBoss: boss({ effect: { kind: "debuff-suit", suit: "hearts" } }),
      }),
      [heart.id],
    );
    expect(result.legal && result.score).toBe(16);
  });

  test("flags bossTriggered when a debuff fires", () => {
    const heart = card("A", "hearts");
    const result = simulatePlay(
      input([heart], {
        blind: 3,
        currentBoss: boss({ effect: { kind: "debuff-suit", suit: "hearts" } }),
      }),
      [heart.id],
    );
    expect(result.legal && result.bossTriggered).toBe(true);
  });
});

describe("simulatePlay — purity", () => {
  test("does not mutate the input hand", () => {
    const ace = card("A", "spades");
    const state = input([ace]);
    const before = JSON.parse(JSON.stringify(state.dealt));
    simulatePlay(state, [ace.id]);
    expect(JSON.parse(JSON.stringify(state.dealt))).toEqual(before);
  });

  test("returns the same score for repeated identical calls", () => {
    const nines = [card("9", "hearts"), card("9", "spades")];
    const state = input(nines, { jokers: [joker()] });
    const first = simulatePlay(state, nines.map((c) => c.id));
    const second = simulatePlay(state, nines.map((c) => c.id));
    expect(first).toEqual(second);
  });
});

describe("simulatePlay — gains-X stack jokers apply on the same hand", () => {
  const twoPair = [
    card("9", "hearts"),
    card("9", "spades"),
    card("5", "clubs"),
    card("5", "diamonds"),
  ];
  const straight = [
    card("9", "hearts"),
    card("8", "spades"),
    card("7", "clubs"),
    card("6", "diamonds"),
    card("5", "hearts"),
  ];

  function mult(cards: ReturnType<typeof card>[], jokers: ReturnType<typeof createSpareTrousersJoker>[]): number {
    const result = simulatePlay(input(cards, { jokers }), cards.map((c) => c.id));
    return result.legal ? result.mult : NaN;
  }

  function chips(cards: ReturnType<typeof card>[], jokers: ReturnType<typeof createRunnerJoker>[]): number {
    const result = simulatePlay(input(cards, { jokers }), cards.map((c) => c.id));
    return result.legal ? result.chips : NaN;
  }

  test("a fresh Spare Trousers adds its +2 Mult on the Two Pair that earns it", () => {
    expect(
      mult(twoPair, [createSpareTrousersJoker()]) - mult(twoPair, []),
    ).toBe(SPARE_TROUSERS_MULT_PER_TWO_PAIR);
  });

  test("a fresh Spare Trousers adds no Mult on a non-Two-Pair hand (negative)", () => {
    const pair = [card("9", "hearts"), card("9", "spades")];
    expect(mult(pair, [createSpareTrousersJoker()]) - mult(pair, [])).toBe(0);
  });

  test("a fresh Runner adds its chips on the Straight that earns them", () => {
    expect(chips(straight, [createRunnerJoker()]) - chips(straight, [])).toBe(
      RUNNER_CHIPS_PER_STRAIGHT,
    );
  });

  test("a fresh Green Joker adds its +Mult on the hand that earns it", () => {
    expect(
      mult(twoPair, [createGreenJokerJoker()]) - mult(twoPair, []),
    ).toBe(GREEN_JOKER_MULT_PER_HAND);
  });
});

describe("simulatePlay — held-in-hand phase applies before the joker phase", () => {
  const nines = [card("9", "hearts"), card("9", "spades")];
  const heldKing = card("K", "clubs");

  function multWith(jokers: ReturnType<typeof createBaronJoker>[]): number {
    const result = simulatePlay(
      input([...nines, heldKing], { jokers }),
      nines.map((c) => c.id),
    );
    return result.legal ? result.mult : NaN;
  }

  test("Baron's held xMult multiplies the base before the joker +Mult is added", () => {
    // base Pair mult 2 -> (2 x 1.5) + 4 = 7, NOT the old lumped (2 + 4) x 1.5 = 9
    expect(multWith([createBaronJoker(), joker()])).toBe(7);
  });

  test("Baron alone xMults the base mult", () => {
    expect(multWith([createBaronJoker()])).toBe(3);
  });

  test("the +Mult joker alone leaves the base mult additive", () => {
    expect(multWith([joker()])).toBe(6);
  });
});

describe("simulatePlay — jokers apply left-to-right within the joker phase", () => {
  const pair = [card("9", "hearts"), card("9", "spades")];
  const xMult3 = joker({
    id: "xmult3",
    effect: { kind: "on-hand-type-x-mult", requires: "Pair", amount: 3 },
  });
  const plus4 = joker({ id: "plus4", effect: { kind: "additive-mult", amount: 4 } });

  function mult(jokers: ReturnType<typeof joker>[]): number {
    const result = simulatePlay(input(pair, { jokers }), pair.map((c) => c.id));
    return result.legal ? result.mult : NaN;
  }

  test("a xMult before a +Mult multiplies the base, then adds: 2 x 3 + 4 = 10", () => {
    expect(mult([xMult3, plus4])).toBe(10);
  });

  test("a +Mult before a xMult adds first, then multiplies: (2 + 4) x 3 = 18", () => {
    expect(mult([plus4, xMult3])).toBe(18);
  });
});

describe("simulatePlay — optimizeJokerOrder picks the best copy-joker placement", () => {
  const pair = [card("9", "hearts"), card("9", "spades")];
  const xMult3 = joker({
    id: "xmult3",
    effect: { kind: "on-hand-type-x-mult", requires: "Pair", amount: 3 },
  });
  const plus4 = joker({ id: "plus4", effect: { kind: "additive-mult", amount: 4 } });
  const blueprint = joker({ id: "blueprint", effect: { kind: "copy-right-joker" } });

  function mult(
    jokers: ReturnType<typeof joker>[],
    optimizeJokerOrder: boolean,
  ): number {
    const result = simulatePlay(
      input(pair, { jokers, optimizeJokerOrder }),
      pair.map((c) => c.id),
    );
    return result.legal ? result.mult : NaN;
  }

  test("scores the declared order when optimization is off", () => {
    expect(mult([xMult3, plus4, blueprint], false)).toBe(10);
  });

  test("scores the optimal copy placement when optimization is on", () => {
    expect(mult([xMult3, plus4, blueprint], true)).toBe(54);
  });
});
