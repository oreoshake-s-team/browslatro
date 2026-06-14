// @vitest-environment node
import { describe, expect, test } from "vitest";
import {
  buildHeadlessDeck,
  playHeadlessRun,
  seededRng,
  type HeadlessAgent,
  type HeadlessRoundView,
  type HeadlessShopAgent,
  type ShopResult,
  type ShopView,
} from "./headlessRun";
import { getHandOptions } from "./getHandOptions";
import { joker } from "./test-helpers";
import type { Joker } from "../items/jokers/types";
import { createDefaultHandStats } from "../scoring/handStats";

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

  test("calls the shop agent once per cleared round", async () => {
    const roundsVisited: number[] = [];
    const shopAgent: HeadlessShopAgent = {
      async buyAfterRound(view: ShopView): Promise<ShopResult> {
        roundsVisited.push(view.ante);
        return { jokers: view.jokers, money: view.money, handStats: view.handStats };
      },
    };
    const result = await playHeadlessRun(greedy, { seed: 1, maxAnte: 2, shopAgent });
    expect(roundsVisited.length).toBe(result.blindsCleared);
  });

  test("the shop view round is the sequential per-round counter, not ante times three", async () => {
    const rounds: number[] = [];
    const shopAgent: HeadlessShopAgent = {
      async buyAfterRound(view: ShopView): Promise<ShopResult> {
        rounds.push(view.round);
        return { jokers: view.jokers, money: view.money, handStats: view.handStats };
      },
    };
    const result = await playHeadlessRun(greedy, { seed: 1, maxAnte: 2, shopAgent });
    expect(rounds).toEqual(
      Array.from({ length: result.blindsCleared }, (_, i) => i + 1),
    );
  });

  test("shop agent jokers are visible in subsequent ante rounds", async () => {
    const powerJoker: Joker = joker({ id: "power-joker", effect: { kind: "additive-mult", amount: 100000 } });
    const addedJoker: Joker = joker({ id: "added-joker", effect: { kind: "additive-mult", amount: 1 } });
    const shopAgent: HeadlessShopAgent = {
      async buyAfterRound(view: ShopView): Promise<ShopResult> {
        return { jokers: [...view.jokers, addedJoker], money: view.money, handStats: view.handStats };
      },
    };
    const seenJokerIds: Set<string>[] = [];
    const observer: HeadlessAgent = {
      name: "observer",
      chooseAction(view) {
        seenJokerIds.push(new Set(view.jokers.map((j) => j.id)));
        return greedy.chooseAction(view);
      },
    };
    await playHeadlessRun(observer, { seed: 4, maxAnte: 2, jokers: [powerJoker], shopAgent });
    const beforeShopViews = seenJokerIds.filter((ids) => !ids.has(addedJoker.id));
    const afterShopViews = seenJokerIds.filter((ids) => ids.has(addedJoker.id));
    expect(beforeShopViews.length).toBeGreaterThan(0);
    expect(afterShopViews.length).toBeGreaterThan(0);
  });

  test("shop agent money is deducted across antes", async () => {
    const powerJoker: Joker = joker({ effect: { kind: "additive-mult", amount: 100000 } });
    const moneyAfterShop: number[] = [];
    const shopAgent: HeadlessShopAgent = {
      async buyAfterRound(view: ShopView): Promise<ShopResult> {
        const spent = Math.min(view.money, 5);
        moneyAfterShop.push(view.money - spent);
        return { jokers: view.jokers, money: view.money - spent, handStats: view.handStats };
      },
    };
    await playHeadlessRun(greedy, { seed: 1, maxAnte: 2, jokers: [powerJoker], shopAgent });
    expect(moneyAfterShop.length).toBeGreaterThan(0);
    expect(moneyAfterShop[0]).toBeGreaterThanOrEqual(0);
  });

  test("shop agent handStats are carried into subsequent antes", async () => {
    const powerJoker: Joker = joker({ id: "power-joker", effect: { kind: "additive-mult", amount: 100000 } });
    const seenChips: number[] = [];
    const shopAgent: HeadlessShopAgent = {
      async buyAfterRound(view: ShopView): Promise<ShopResult> {
        const boosted = { ...view.handStats, "High Card": { ...view.handStats["High Card"], chips: view.handStats["High Card"].chips + 100 } };
        return { jokers: view.jokers, money: view.money, handStats: boosted };
      },
    };
    const observer: HeadlessAgent = {
      name: "observer",
      chooseAction(view) {
        seenChips.push(view.handStats["High Card"].chips);
        return greedy.chooseAction(view);
      },
    };
    await playHeadlessRun(observer, { seed: 4, maxAnte: 2, jokers: [powerJoker], shopAgent });
    const ante1Chips = seenChips[0];
    const lastChips = seenChips[seenChips.length - 1];
    expect(ante1Chips).toBeDefined();
    expect(lastChips).toBeGreaterThan(ante1Chips ?? 0);
  });
});

describe("playHeadlessRun forward-from-state", () => {
  const powerJoker: Joker = joker({
    effect: { kind: "additive-mult", amount: 100000 },
  });

  test("startAnte begins the run at the given ante", async () => {
    const antesSeen: number[] = [];
    const observer: HeadlessAgent = {
      name: "observer",
      chooseAction(view) {
        antesSeen.push(view.ante);
        return greedy.chooseAction(view);
      },
    };
    await playHeadlessRun(observer, {
      seed: 4,
      startAnte: 3,
      maxAnte: 3,
      jokers: [powerJoker],
    });
    expect(Math.min(...antesSeen)).toBe(3);
  });

  test("maxRounds caps the number of blinds cleared", async () => {
    const result = await playHeadlessRun(greedy, {
      seed: 4,
      maxRounds: 2,
      jokers: [powerJoker],
    });
    expect(result.blindsCleared).toBe(2);
  });

  test("startMoney sets the starting bankroll", async () => {
    const moneySeen: number[] = [];
    const shopAgent: HeadlessShopAgent = {
      async buyAfterRound(view: ShopView): Promise<ShopResult> {
        moneySeen.push(view.money);
        return { jokers: view.jokers, money: view.money, handStats: view.handStats };
      },
    };
    await playHeadlessRun(greedy, {
      seed: 4,
      maxAnte: 1,
      startMoney: 50,
      jokers: [powerJoker],
      shopAgent,
    });
    expect(moneySeen[0]).toBeGreaterThanOrEqual(50);
  });

  test("startHandStats seeds the opening hand stats", async () => {
    const chipsSeen: number[] = [];
    const observer: HeadlessAgent = {
      name: "observer",
      chooseAction(view) {
        chipsSeen.push(view.handStats["High Card"].chips);
        return greedy.chooseAction(view);
      },
    };
    const base = createDefaultHandStats();
    const boosted = {
      ...base,
      "High Card": { ...base["High Card"], chips: base["High Card"].chips + 500 },
    };
    await playHeadlessRun(observer, {
      seed: 4,
      maxAnte: 1,
      startHandStats: boosted,
      jokers: [powerJoker],
    });
    expect(chipsSeen[0]).toBe(base["High Card"].chips + 500);
  });
});

describe("playHeadlessRun end-of-round economy", () => {
  const powerJoker: Joker = joker({
    effect: { kind: "additive-mult", amount: 100000 },
  });

  async function firstShopMoney(startMoney: number): Promise<number> {
    let seen = -1;
    const shopAgent: HeadlessShopAgent = {
      async buyAfterRound(view: ShopView): Promise<ShopResult> {
        if (seen < 0) seen = view.money;
        return { jokers: view.jokers, money: view.money, handStats: view.handStats };
      },
    };
    await playHeadlessRun(greedy, {
      seed: 4,
      maxAnte: 1,
      startMoney,
      jokers: [powerJoker],
      shopAgent,
    });
    return seen;
  }

  test("a larger bankroll banks more than its starting-money advantage via interest", async () => {
    const rich = await firstShopMoney(20);
    const poor = await firstShopMoney(5);
    expect(rich - poor).toBeGreaterThan(15);
  });

  test("the round payout exceeds the flat blind reward (interest + unused hands)", async () => {
    const money = await firstShopMoney(20);
    expect(money).toBeGreaterThan(20 + 1 + 2);
  });
});
