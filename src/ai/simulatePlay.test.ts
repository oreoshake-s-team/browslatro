// @vitest-environment node
import { describe, expect, test } from "vitest";
import { simulatePlay, type SimulatePlayInput } from "./simulatePlay";
import type { Card, Rank, Suit } from "../cards/types";
import type { BossBlind } from "../items/bosses";
import type { Joker } from "../items/jokers/types";
import { createDefaultHandStats } from "../scoring/handStats";
import { emptyHandCounts } from "../components/hud/handPlayCounts";

let nextId = 0;

function card(rank: Rank, suit: Suit, extra?: Partial<Card>): Card {
  return { id: ++nextId, rank, suit, ...extra };
}

function joker(extra?: Partial<Joker>): Joker {
  return {
    id: "test-joker",
    name: "Test Joker",
    description: "+4 Mult",
    effect: { kind: "additive-mult", amount: 4 },
    rarity: "common",
    ...extra,
  };
}

function boss(extra?: Partial<BossBlind>): BossBlind {
  return {
    id: "the-wall",
    name: "The Wall",
    description: "Extra large blind requirement.",
    scoreMultiplier: 4,
    anteMin: 2,
    effect: { kind: "none" },
    ...extra,
  };
}

function input(
  hand: ReadonlyArray<Card>,
  extra?: Partial<SimulatePlayInput>,
): SimulatePlayInput {
  return {
    dealt: { hand, remaining: [] },
    baseDeckCards: [],
    destroyedCardIds: new Set(),
    addedCards: [],
    cardEnhancementsById: new Map(),
    cardSealsById: new Map(),
    jokers: [],
    handStats: createDefaultHandStats(),
    handPlayCounts: emptyHandCounts(),
    handHistoryThisRound: [],
    playedCardKeysThisAnte: new Set(),
    consumables: [],
    ownedVoucherIds: new Set(),
    blind: 1,
    currentBoss: boss(),
    money: 4,
    remainingHands: 4,
    remainingDiscards: 3,
    runStats: { blindsSkipped: 0 },
    todoHand: null,
    idolTarget: null,
    ancientSuit: null,
    ...extra,
  };
}

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

  test("rejects a hand label blocked by the boss on a boss round", () => {
    const c = card("A", "spades");
    const result = simulatePlay(
      input([c], {
        blind: 3,
        currentBoss: boss({ effect: { kind: "single-hand-type" } }),
        handHistoryThisRound: ["Pair"],
      }),
      [c.id],
    );
    expect(result).toEqual({ legal: false, reason: "boss-blocks-hand" });
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
