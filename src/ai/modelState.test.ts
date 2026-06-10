// @vitest-environment node
import { describe, expect, test } from "vitest";
import { toModelState, type ModelStateInput } from "./modelState";
import type { Card, Rank, Suit } from "../cards/types";
import { BASE_CHIPS } from "../constants";
import type { BossBlind } from "../items/bosses";
import type { Joker } from "../items/jokers/types";

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

function input(extra?: Partial<ModelStateInput>): ModelStateInput {
  return {
    dealt: { hand: [card("A", "spades")], remaining: [] },
    jokers: [],
    blind: 1,
    ante: 1,
    round: 1,
    currentBoss: boss(),
    selectedStake: "white",
    money: 4,
    remainingHands: 4,
    remainingDiscards: 3,
    roundScore: 0,
    ...extra,
  };
}

describe("toModelState — hand cards", () => {
  test("serializes a face-up card with all fields populated", () => {
    const c = card("K", "hearts", {
      enhancement: "glass",
      seal: "red",
      edition: "foil",
      bonusChips: 30,
    });
    expect(
      toModelState(input({ dealt: { hand: [c], remaining: [] } })).hand[0],
    ).toEqual({
      id: c.id,
      faceDown: false,
      rank: "K",
      suit: "hearts",
      enhancement: "glass",
      seal: "red",
      edition: "foil",
      bonusChips: 30,
    });
  });

  test("defaults optional card fields to null and zero", () => {
    const c = card("7", "clubs");
    expect(
      toModelState(input({ dealt: { hand: [c], remaining: [] } })).hand[0],
    ).toEqual({
      id: c.id,
      faceDown: false,
      rank: "7",
      suit: "clubs",
      enhancement: null,
      seal: null,
      edition: null,
      bonusChips: 0,
    });
  });

  test("a face-down card exposes only its id", () => {
    const c = card("A", "spades", { faceDown: true, enhancement: "steel" });
    expect(
      toModelState(input({ dealt: { hand: [c], remaining: [] } })).hand[0],
    ).toEqual({ id: c.id, faceDown: true });
  });
});

describe("toModelState — jokers", () => {
  test("preserves joker order left to right", () => {
    const state = toModelState(
      input({
        jokers: [joker({ id: "left" }), joker({ id: "right" })],
      }),
    );
    expect(state.jokers.map((j) => j.id)).toEqual(["left", "right"]);
  });

  test("serializes effect kind, rarity, edition, and stickers", () => {
    const state = toModelState(
      input({
        jokers: [
          joker({
            edition: "polychrome",
            stickers: [{ kind: "perishable", roundsHeld: 2 }, { kind: "rental" }],
          }),
        ],
      }),
    );
    expect(state.jokers[0]).toEqual({
      id: "test-joker",
      name: "Test Joker",
      description: "+4 Mult",
      effectKind: "additive-mult",
      rarity: "common",
      edition: "polychrome",
      stickers: ["perishable", "rental"],
      counter: null,
    });
  });

  test("counter is null for jokers without counter state", () => {
    expect(toModelState(input({ jokers: [joker()] })).jokers[0].counter).toBeNull();
  });

  test("counter carries the stored value", () => {
    const state = toModelState(
      input({ jokers: [joker({ state: { kind: "counter", value: 7 } })] }),
    );
    expect(state.jokers[0].counter).toBe(7);
  });
});

describe("toModelState — blind", () => {
  test("small blind uses the blind name and base target", () => {
    expect(toModelState(input({ blind: 1, ante: 1 })).blind).toEqual({
      kind: "small",
      name: "Small Blind",
      scoreTarget: BASE_CHIPS[0],
      boss: null,
    });
  });

  test("big blind target scales by 1.5", () => {
    expect(toModelState(input({ blind: 2, ante: 2 })).blind.scoreTarget).toBe(
      BASE_CHIPS[1] * 1.5,
    );
  });

  test("boss blind target uses the boss score multiplier", () => {
    expect(toModelState(input({ blind: 3, ante: 1 })).blind.scoreTarget).toBe(
      BASE_CHIPS[0] * 4,
    );
  });

  test("boss round includes the boss effect", () => {
    expect(toModelState(input({ blind: 3 })).blind.boss).toEqual({
      id: "the-wall",
      name: "The Wall",
      description: "Extra large blind requirement.",
      effectKind: "none",
    });
  });

  test("boss round uses the boss name as the blind name", () => {
    expect(toModelState(input({ blind: 3 })).blind.name).toBe("The Wall");
  });

  test("non-boss rounds omit the boss even though one is rolled", () => {
    expect(toModelState(input({ blind: 2 })).blind.boss).toBeNull();
  });
});

describe("toModelState — deck composition", () => {
  test("counts remaining cards by suit", () => {
    const remaining = [
      card("2", "hearts"),
      card("3", "hearts"),
      card("4", "spades"),
    ];
    expect(
      toModelState(input({ dealt: { hand: [], remaining } })).deck.bySuit,
    ).toEqual({ spades: 1, hearts: 2, diamonds: 0, clubs: 0 });
  });

  test("counts remaining cards by rank", () => {
    const remaining = [card("A", "hearts"), card("A", "spades")];
    expect(
      toModelState(input({ dealt: { hand: [], remaining } })).deck.byRank.A,
    ).toBe(2);
  });

  test("total matches the remaining card count", () => {
    const remaining = [card("2", "clubs"), card("9", "diamonds")];
    expect(
      toModelState(input({ dealt: { hand: [], remaining } })).deck.total,
    ).toBe(2);
  });

  test("hand cards are not counted in the deck composition", () => {
    const state = toModelState(
      input({ dealt: { hand: [card("A", "spades")], remaining: [] } }),
    );
    expect(state.deck.total).toBe(0);
  });
});

describe("toModelState — context passthrough", () => {
  test("carries money, resources, score, ante, and round", () => {
    const state = toModelState(
      input({
        money: 12,
        remainingHands: 2,
        remainingDiscards: 1,
        roundScore: 450,
        ante: 3,
        round: 8,
      }),
    );
    expect([
      state.money,
      state.remainingHands,
      state.remainingDiscards,
      state.roundScore,
      state.ante,
      state.round,
    ]).toEqual([12, 2, 1, 450, 3, 8]);
  });
});

describe("toModelState — serializability", () => {
  test("round-trips through JSON without loss", () => {
    const state = toModelState(
      input({
        dealt: {
          hand: [card("A", "spades", { faceDown: true }), card("K", "hearts")],
          remaining: [card("2", "clubs")],
        },
        jokers: [joker({ state: { kind: "counter", value: 3 } })],
        blind: 3,
      }),
    );
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });
});
