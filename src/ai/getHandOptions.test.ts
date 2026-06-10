// @vitest-environment node
import { describe, expect, test } from "vitest";
import { getHandOptions, type PlayOption } from "./getHandOptions";
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
