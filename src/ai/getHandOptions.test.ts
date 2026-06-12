// @vitest-environment node
import { describe, expect, test } from "vitest";
import type { Card, Enhancement, Rank, Seal, Suit } from "../cards/types";
import type { HandLabel } from "../scoring/handEvaluator";
import {
  excludeFaceDownCandidates,
  getHandOptions,
  type PlayOption,
} from "./getHandOptions";
import { seededRng } from "./headlessRun";
import { simulatePlay, type SimulatePlayInput } from "./simulatePlay";
import { boss, card, simulateInput } from "./test-helpers";

function plays(options: ReturnType<typeof getHandOptions>): PlayOption[] {
  return options.filter((o): o is PlayOption => o.action === "play");
}

describe("getHandOptions — play candidates", () => {
  const pairHand = [
    card("9", "hearts"),
    card("9", "spades"),
    card("A", "clubs"),
    card("4", "diamonds"),
    card("7", "clubs"),
  ];

  test("ranks the pair of nines as the best immediate play", () => {
    const best = plays(getHandOptions(simulateInput(pairHand)))[0];
    expect(best).toMatchObject({ handLabel: "Pair", score: 56 });
  });

  test("flags the top play as best immediate score", () => {
    const best = plays(getHandOptions(simulateInput(pairHand)))[0];
    expect(best.notes).toEqual([{ kind: "best-immediate-score" }]);
  });

  test("flags non-top plays as best of their hand type", () => {
    const rest = plays(getHandOptions(simulateInput(pairHand))).slice(1);
    expect(rest.every((o) => o.notes[0].kind === "best-of-hand-type")).toBe(
      true,
    );
  });

  test("sorts play options by score descending", () => {
    const scores = plays(getHandOptions(simulateInput(pairHand))).map(
      (o) => o.score,
    );
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
  });

  test("returns at most one play per hand label", () => {
    const labels = plays(getHandOptions(simulateInput(pairHand))).map(
      (o) => o.handLabel,
    );
    expect(new Set(labels).size).toBe(labels.length);
  });

  test("respects the topN cap", () => {
    expect(plays(getHandOptions(simulateInput(pairHand), 2))).toHaveLength(2);
  });

  test("returns no options for an empty hand", () => {
    expect(getHandOptions(simulateInput([], { remainingDiscards: 0 }))).toEqual(
      [],
    );
  });

  test("excludes hand types the boss blocks", () => {
    const options = getHandOptions(
      simulateInput(pairHand, {
        blind: 3,
        currentBoss: boss({ effect: { kind: "single-hand-type" } }),
        handHistoryThisRound: ["Pair"],
      }),
    );
    expect(plays(options).every((o) => o.handLabel === "Pair")).toBe(true);
  });
});

describe("getHandOptions — discard candidates", () => {
  const flushBuildHand = [
    card("2", "hearts"),
    card("6", "hearts"),
    card("9", "hearts"),
    card("K", "hearts"),
    card("3", "clubs"),
    card("J", "spades"),
  ];

  test("proposes discarding off-suit cards to build a flush", () => {
    const discard = getHandOptions(simulateInput(flushBuildHand)).find(
      (o) => o.action === "discard",
    );
    expect(discard?.cardIds).toEqual([
      flushBuildHand[4].id,
      flushBuildHand[5].id,
    ]);
  });

  test("annotates the flush build with its suit", () => {
    const discard = getHandOptions(simulateInput(flushBuildHand)).find(
      (o) => o.action === "discard",
    );
    expect(discard?.notes).toEqual([
      { kind: "commits-to-flush-build", suit: "hearts" },
    ]);
  });

  test("proposes keeping paired ranks by discarding singletons", () => {
    const hand = [
      card("9", "hearts"),
      card("9", "spades"),
      card("2", "clubs"),
      card("K", "diamonds"),
    ];
    const discard = getHandOptions(simulateInput(hand)).find(
      (o) => o.action === "discard",
    );
    expect(discard).toMatchObject({
      cardIds: [hand[2].id, hand[3].id],
      notes: [{ kind: "keeps-paired-ranks", ranks: ["9"] }],
    });
  });

  test("offers no discards when none remain", () => {
    const options = getHandOptions(
      simulateInput(flushBuildHand, { remainingDiscards: 0 }),
    );
    expect(options.some((o) => o.action === "discard")).toBe(false);
  });

  test("does not propose a flush build when the flush is already made", () => {
    const made = [
      card("2", "hearts"),
      card("6", "hearts"),
      card("9", "hearts"),
      card("K", "hearts"),
      card("A", "hearts"),
    ];
    const options = getHandOptions(simulateInput(made));
    expect(
      options.some(
        (o) =>
          o.action === "discard" &&
          o.notes[0].kind === "commits-to-flush-build",
      ),
    ).toBe(false);
  });

  test("never proposes discarding more than five cards", () => {
    const wide = [
      card("2", "hearts"),
      card("3", "hearts"),
      card("5", "hearts"),
      card("4", "clubs"),
      card("6", "spades"),
      card("8", "diamonds"),
      card("10", "clubs"),
      card("Q", "spades"),
      card("K", "diamonds"),
      card("A", "clubs"),
    ];
    const discards = getHandOptions(simulateInput(wide)).filter(
      (o) => o.action === "discard",
    );
    expect(discards.every((o) => o.cardIds.length <= 5)).toBe(true);
  });
});

function* subsets(ids: ReadonlyArray<number>): Generator<number[]> {
  for (let mask = 1; mask < 1 << ids.length; mask += 1) {
    const picked = ids.filter((_, i) => (mask & (1 << i)) !== 0);
    if (picked.length <= 5) yield picked;
  }
}

function bruteForceBestPerLabel(input: SimulatePlayInput) {
  const best = new Map<HandLabel, { cardIds: number[]; score: number }>();
  for (let size = 1; size <= 5; size += 1) {
    for (const cardIds of subsets(input.dealt.hand.map((c) => c.id))) {
      if (cardIds.length !== size) continue;
      const result = simulatePlay(input, cardIds);
      if (!result.legal) continue;
      const current = best.get(result.handLabel);
      if (current !== undefined && current.score >= result.score) continue;
      best.set(result.handLabel, { cardIds, score: result.score });
    }
  }
  return best;
}

function randomHand(seed: number): Card[] {
  const rng = seededRng(seed);
  const ranks: Rank[] = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
  const suits: Suit[] = ["spades", "hearts", "diamonds", "clubs"];
  const enhancements: (Enhancement | undefined)[] = [
    undefined, undefined, undefined, "bonus", "mult", "glass", "steel", "stone", "gold", "lucky",
  ];
  const seals: (Seal | undefined)[] = [undefined, undefined, undefined, "red", "gold"];
  return Array.from({ length: 8 }, () =>
    card(
      ranks[Math.floor(rng() * ranks.length)],
      suits[Math.floor(rng() * suits.length)],
      {
        enhancement: enhancements[Math.floor(rng() * enhancements.length)],
        seal: seals[Math.floor(rng() * seals.length)],
        bonusChips: rng() < 0.2 ? 30 : 0,
      },
    ),
  );
}

describe("getHandOptions — fast path equivalence with full simulation", () => {
  test("matches brute-force per-label winners on seeded no-joker hands", () => {
    for (let seed = 0; seed < 25; seed += 1) {
      const input = simulateInput(randomHand(seed));
      const plays = getHandOptions(input, 13).filter(
        (o): o is PlayOption => o.action === "play",
      );
      const reference = bruteForceBestPerLabel(input);
      expect(plays.length).toBe(reference.size);
      for (const option of plays) {
        expect(reference.get(option.handLabel)).toEqual({
          cardIds: [...option.cardIds],
          score: option.score,
        });
      }
    }
  });

  test("matches brute force when hand levels are upgraded", () => {
    const input = simulateInput(randomHand(99));
    const upgraded = {
      ...input.handStats,
      Pair: { chips: 30, multiplier: 4, level: 3 },
    };
    const leveled = { ...input, handStats: upgraded };
    const plays = getHandOptions(leveled, 13).filter(
      (o): o is PlayOption => o.action === "play",
    );
    const reference = bruteForceBestPerLabel(leveled);
    for (const option of plays) {
      expect(reference.get(option.handLabel)?.score).toBe(option.score);
    }
  });
});

describe("excludeFaceDownCandidates", () => {
  const hand: ReadonlyArray<Card> = [
    { id: 1, rank: "9", suit: "hearts", faceDown: true },
    { id: 2, rank: "9", suit: "spades" },
    { id: 3, rank: "K", suit: "clubs" },
  ];

  function candidate(cardIds: ReadonlyArray<number>): PlayOption {
    return {
      action: "play",
      cardIds,
      handLabel: "High Card",
      score: 10,
      chips: 5,
      mult: 2,
      notes: [],
    };
  }

  test("drops candidates that include a face-down card", () => {
    const kept = excludeFaceDownCandidates(
      [candidate([1, 2]), candidate([2, 3])],
      hand,
    );
    expect(kept).toEqual([candidate([2, 3])]);
  });

  test("returns the same list when no cards are face-down", () => {
    const faceUp = hand.map((c) => ({ ...c, faceDown: undefined }));
    const candidates = [candidate([1, 2])];
    expect(excludeFaceDownCandidates(candidates, faceUp)).toEqual(candidates);
  });

  test("returns an empty list when every candidate uses a face-down card", () => {
    expect(excludeFaceDownCandidates([candidate([1])], hand)).toHaveLength(0);
  });
});
