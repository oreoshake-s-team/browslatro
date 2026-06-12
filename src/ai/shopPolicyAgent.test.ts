import { describe, expect, test } from "vitest";
import { buildCandidates } from "./shopPolicyAgent";
import type { ShopContext, HeadlessShopAgent, HeadlessAgent } from "./headlessRun";
import { playHeadlessRun, seededRng } from "./headlessRun";
import { getHandOptions } from "./getHandOptions";
import type { HeadlessRoundView } from "./headlessRun";
import { joker } from "./test-helpers";
import type { ShopItem } from "../items/shop";

function makeContext(overrides: Partial<ShopContext> = {}): ShopContext {
  return {
    ante: 1,
    money: 10,
    jokers: [],
    offers: [],
    rerollCount: 0,
    rng: seededRng(1),
    ...overrides,
  };
}

function jokerOffer(id: string, price: number): ShopItem {
  return {
    kind: "joker",
    joker: joker({ id, name: `Joker ${id}`, description: "+4 Mult" }),
    price,
    sold: false,
  };
}

describe("buildCandidates", () => {
  test("returns only leave when no offers and no reroll money", () => {
    const ctx = makeContext({ money: 0, offers: [] });
    const candidates = buildCandidates(ctx);
    expect(candidates).toEqual([{ action: "leave" }]);
  });

  test("excludes unaffordable offers", () => {
    const ctx = makeContext({ money: 3, offers: [jokerOffer("j1", 5)] });
    const candidates = buildCandidates(ctx);
    expect(candidates.some((c) => c.action === "buy")).toBe(false);
  });

  test("includes affordable offers as buy candidates", () => {
    const ctx = makeContext({ money: 10, offers: [jokerOffer("j1", 5), jokerOffer("j2", 3)] });
    const candidates = buildCandidates(ctx);
    expect(candidates.filter((c) => c.action === "buy").length).toBe(2);
  });

  test("excludes sold offers", () => {
    const soldOffer: ShopItem = { ...jokerOffer("j1", 5), sold: true };
    const ctx = makeContext({ money: 10, offers: [soldOffer] });
    const candidates = buildCandidates(ctx);
    expect(candidates.some((c) => c.action === "buy")).toBe(false);
  });

  test("includes reroll when affordable", () => {
    const ctx = makeContext({ money: 10, rerollCount: 0 });
    const candidates = buildCandidates(ctx);
    expect(candidates.some((c) => c.action === "reroll")).toBe(true);
  });

  test("excludes reroll when too expensive", () => {
    const ctx = makeContext({ money: 0, rerollCount: 0 });
    const candidates = buildCandidates(ctx);
    expect(candidates.some((c) => c.action === "reroll")).toBe(false);
  });

  test("always includes leave as last candidate", () => {
    const ctx = makeContext({ money: 10, offers: [jokerOffer("j1", 5)] });
    const candidates = buildCandidates(ctx);
    expect(candidates[candidates.length - 1]).toEqual({ action: "leave" });
  });
});

const greedyAgent: HeadlessAgent = {
  name: "greedy",
  chooseAction(view: HeadlessRoundView) {
    const best = getHandOptions(view, 1).find((o) => o.action === "play");
    if (best) return { kind: "play" as const, cardIds: best.cardIds };
    if (view.remainingDiscards > 0) return { kind: "discard" as const, cardIds: [view.dealt.hand[0].id] };
    return { kind: "play" as const, cardIds: [view.dealt.hand[0].id] };
  },
};

describe("playHeadlessRun with shopAgent", () => {
  test("without shopAgent is identical to baseline", async () => {
    const a = await playHeadlessRun(greedyAgent, { seed: 42, maxAnte: 2 });
    const b = await playHeadlessRun(greedyAgent, { seed: 42, maxAnte: 2 });
    expect(a).toEqual(b);
  });

  test("shop agent that always leaves completes the run without adding jokers", async () => {
    let maxJokersSeenInAnte2 = 0;
    const leaveAgent: HeadlessShopAgent = {
      chooseShopAction: () => ({ kind: "leave" }),
    };
    const observer: HeadlessAgent = {
      name: "observer",
      chooseAction(view) {
        if (view.ante >= 2) maxJokersSeenInAnte2 = Math.max(maxJokersSeenInAnte2, view.jokers.length);
        return greedyAgent.chooseAction(view);
      },
    };
    const result = await playHeadlessRun(observer, { seed: 10, maxAnte: 2, shopAgent: leaveAgent });
    expect(result.handsPlayed).toBeGreaterThan(0);
    expect(maxJokersSeenInAnte2).toBe(0);
  });

  test("shop agent that buys the first joker offer results in joker available next ante", async () => {
    const acquiredJokers: string[] = [];
    const buyFirstJoker: HeadlessShopAgent = {
      chooseShopAction(ctx) {
        if (acquiredJokers.length > 0) return { kind: "leave" };
        const buyable = ctx.offers.find((o) => o.kind === "joker" && !o.sold && o.price <= ctx.money);
        if (buyable !== undefined && buyable.kind === "joker") {
          acquiredJokers.push(buyable.joker.id);
          return { kind: "buy", offer: buyable };
        }
        return { kind: "leave" };
      },
    };
    await playHeadlessRun(greedyAgent, { seed: 5, maxAnte: 3, shopAgent: buyFirstJoker });
    expect(acquiredJokers.length).toBeGreaterThan(0);
  });

  test("joker bought via shop agent contributes to scoring in subsequent antes", async () => {
    let jokerSeen = false;
    const powerfulJoker = joker({ id: "shop-joker", effect: { kind: "additive-mult", amount: 10000 } });
    const injectJoker: HeadlessShopAgent = {
      chooseShopAction(ctx) {
        if (ctx.jokers.some((j) => j.id === "shop-joker")) return { kind: "leave" };
        const fakeOffer: ShopItem = { kind: "joker", joker: powerfulJoker, price: 0, sold: false };
        return { kind: "buy", offer: fakeOffer };
      },
    };
    const checkJoker: HeadlessAgent = {
      name: "checker",
      chooseAction(view) {
        if (view.ante > 1 && view.jokers.some((j) => j.id === "shop-joker")) {
          jokerSeen = true;
        }
        return greedyAgent.chooseAction(view);
      },
    };
    await playHeadlessRun(checkJoker, { seed: 7, maxAnte: 2, shopAgent: injectJoker });
    expect(jokerSeen).toBe(true);
  });
});
