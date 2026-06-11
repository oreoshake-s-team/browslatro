// @vitest-environment node
import { describe, expect, test } from "vitest";
import {
  buildHeadlessDeck,
  playHeadlessRun,
  seededRng,
  type HeadlessAgent,
  type HeadlessRoundView,
} from "./headlessRun";
import { getHandOptions } from "./getHandOptions";
import { joker } from "./test-helpers";

const greedy: HeadlessAgent = {
  name: "greedy-test",
  chooseAction(view: HeadlessRoundView) {
    const best = getHandOptions(view, 1).find((o) => o.action === "play");
    if (best !== undefined) return { kind: "play", cardIds: best.cardIds };
    if (view.remainingDiscards > 0) {
      return { kind: "discard", cardIds: [view.dealt.hand[0].id] };
    }
    return { kind: "play", cardIds: [view.dealt.hand[0].id] };
  },
};

describe("seededRng", () => {
  test("produces an identical sequence for the same seed", () => {
    const a = seededRng(42);
    const b = seededRng(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  test("produces values in [0, 1)", () => {
    const rng = seededRng(7);
    const values = Array.from({ length: 100 }, () => rng());
    expect(values.every((v) => v >= 0 && v < 1)).toBe(true);
  });
});

describe("buildHeadlessDeck", () => {
  test("contains 52 unique cards", () => {
    const deck = buildHeadlessDeck();
    expect(new Set(deck.map((c) => `${c.rank}-${c.suit}`)).size).toBe(52);
  });
});

describe("playHeadlessRun", () => {
  test("the same seed and agent reproduce an identical result", async () => {
    const first = await playHeadlessRun(greedy, { seed: 123 });
    const second = await playHeadlessRun(greedy, { seed: 123 });
    expect(first).toEqual(second);
  });

  test("plays at least one hand", async () => {
    const result = await playHeadlessRun(greedy, { seed: 1 });
    expect(result.handsPlayed).toBeGreaterThan(0);
  });

  test("blinds cleared is consistent with the ante reached", async () => {
    const result = await playHeadlessRun(greedy, { seed: 5 });
    const fullAntesCleared = result.won
      ? result.anteReached
      : result.anteReached - 1;
    expect(result.blindsCleared).toBeGreaterThanOrEqual(fullAntesCleared * 3);
  });

  test("a powerful joker carries the run to a maxAnte win", async () => {
    const result = await playHeadlessRun(greedy, {
      seed: 11,
      maxAnte: 1,
      jokers: [joker({ effect: { kind: "additive-mult", amount: 100000 } })],
    });
    expect(result).toMatchObject({ won: true, anteReached: 1, blindsCleared: 3 });
  });

  test("deals a full hand at the start of every decision until the deck thins", async () => {
    const seen: number[] = [];
    const observer: HeadlessAgent = {
      name: "observer",
      chooseAction(view) {
        seen.push(view.dealt.hand.length + view.dealt.remaining.length);
        return greedy.chooseAction(view);
      },
    };
    await playHeadlessRun(observer, { seed: 3, maxAnte: 1 });
    expect(seen.every((total) => total <= 52)).toBe(true);
  });

  test("throws when an agent discards with none remaining", async () => {
    const stubborn: HeadlessAgent = {
      name: "stubborn",
      chooseAction(view) {
        return { kind: "discard", cardIds: [view.dealt.hand[0].id] };
      },
    };
    await expect(playHeadlessRun(stubborn, { seed: 2 })).rejects.toThrow(
      "discarded with none remaining",
    );
  });

  test("throws when an agent plays cards it does not hold", async () => {
    const cheater: HeadlessAgent = {
      name: "cheater",
      chooseAction() {
        return { kind: "play", cardIds: [999999] };
      },
    };
    await expect(playHeadlessRun(cheater, { seed: 2 })).rejects.toThrow(
      "illegal play",
    );
  });

  test("throws when an agent discards more than five cards", async () => {
    const dumper: HeadlessAgent = {
      name: "dumper",
      chooseAction(view) {
        return {
          kind: "discard",
          cardIds: view.dealt.hand.slice(0, 6).map((c) => c.id),
        };
      },
    };
    await expect(playHeadlessRun(dumper, { seed: 2 })).rejects.toThrow(
      "discarded 6 cards",
    );
  });
});
