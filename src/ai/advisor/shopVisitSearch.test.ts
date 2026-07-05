// @vitest-environment node
import { describe, expect, test } from "vitest";
import { searchShopVisit, type StateEvaluator } from "./shopVisitSearch";
import { EMPTY_SHOP_BUILD, SHOP_CONTEXT_FEATURES } from "./shopEncoding";
import type { ShopSearchState } from "./shopTransition";
import type { ShopAdviceCandidate } from "./types";

interface DecodedContext {
  readonly money: number;
  readonly levelSum: number;
  readonly jokers: number;
  readonly multJokers: number;
  readonly xMultJokers: number;
}

function decode(contexts: Float32Array, row: number): DecodedContext {
  const at = (i: number): number => contexts[row * SHOP_CONTEXT_FEATURES + i];
  let levelSum = 0;
  for (let i = 4; i < 17; i += 1) levelSum += at(i) * 20 - 1;
  return {
    money: at(0) * 20,
    levelSum,
    jokers: at(17) * 5,
    multJokers: at(22) * 5,
    xMultJokers: at(23) * 5,
  };
}

function evaluator(valueOf: (ctx: DecodedContext) => number): { fn: StateEvaluator; calls: number[] } {
  const calls: number[] = [];
  const fn: StateEvaluator = async (contexts, rows) => {
    calls.push(rows);
    const out = new Float32Array(rows);
    for (let row = 0; row < rows; row += 1) out[row] = valueOf(decode(contexts, row));
    return out;
  };
  return { fn, calls };
}

function jokerBuy(id: string, cost: number, category = "joker-mult"): ShopAdviceCandidate {
  const attributes = new Array<number>(18).fill(0);
  attributes[14] = 0.25;
  return { action: "buy", item: { itemType: "joker", category, attributes, id, name: id, description: "", cost } };
}

function jokerSell(id: string, value: number, category = "joker-mult"): ShopAdviceCandidate {
  const attributes = new Array<number>(18).fill(0);
  attributes[14] = 0.25;
  return { action: "sell", item: { itemType: "joker", category, attributes, id, name: id, description: "", cost: -value } };
}

function planetUse(hands: ReadonlyArray<string>): ShopAdviceCandidate {
  return { action: "use", item: { itemType: "planet", category: "planet", advancesHands: hands, id: "p", name: "P", description: "", cost: 0 } };
}

function state(money: number, build: Partial<ShopSearchState["build"]> = {}): ShopSearchState {
  return { build: { ...EMPTY_SHOP_BUILD, ...build }, money };
}

function search(
  candidates: ReadonlyArray<ShopAdviceCandidate>,
  start: ShopSearchState,
  valueOf: (ctx: DecodedContext) => number,
) {
  const { fn, calls } = evaluator(valueOf);
  return searchShopVisit({ candidates, state: start, ante: 2, round: 5 }, fn).then((plan) => ({ plan, calls }));
}

describe("searchShopVisit", () => {
  test("prefers buying a joker over leaving when V rewards jokers", async () => {
    const { plan } = await search(
      [jokerBuy("a", 6), { action: "leave" }],
      state(10),
      (ctx) => ctx.jokers * 5 + ctx.money * 0.1,
    );
    expect(plan.firstIndex).toBe(0);
  });

  test("plans a multi-buy sequence when both are affordable", async () => {
    const { plan } = await search(
      [jokerBuy("a", 6), jokerBuy("b", 6)],
      state(20),
      (ctx) => ctx.jokers * 5 + ctx.money * 0.1,
    );
    expect(plan.sequence).toHaveLength(2);
  });

  test("respects the budget when only one buy fits", async () => {
    const { plan } = await search(
      [jokerBuy("a", 6), jokerBuy("b", 6)],
      state(8),
      (ctx) => ctx.jokers * 5 + ctx.money * 0.1,
    );
    expect(plan.sequence).toHaveLength(1);
  });

  test("returns leave when V only values money", async () => {
    const { plan } = await search(
      [jokerBuy("a", 6), planetUse(["Pair"])],
      state(10, { consumablesHeld: 1 }),
      (ctx) => ctx.money,
    );
    expect(plan.firstIndex).toBeNull();
    expect(plan.score).toBe(plan.baselineScore);
  });

  test("uses a held planet when V rewards hand levels", async () => {
    const { plan } = await search(
      [planetUse(["Flush"]), { action: "leave" }],
      state(4, { consumablesHeld: 1 }),
      (ctx) => ctx.levelSum * 3 + ctx.money * 0.1,
    );
    expect(plan.firstIndex).toBe(0);
  });

  test("plans a sell-then-upgrade swap when the search finds it worthwhile", async () => {
    const { plan } = await search(
      [jokerSell("sell:old:0", 3, "joker-mult"), jokerBuy("x", 8, "joker-x-mult")],
      state(5, { jokers: [{ effectKind: "additive-mult", rarity: "common" }] }),
      (ctx) => ctx.multJokers * 2 + ctx.xMultJokers * 6 + ctx.money * 0.1,
    );
    expect(plan.sequence).toEqual([0, 1]);
  });

  test("a reroll is scored but never expanded past the stochastic point", async () => {
    const { plan } = await search(
      [{ action: "reroll", cost: 5 }, jokerBuy("a", 6)],
      state(10),
      (ctx) => 20 - ctx.money,
    );
    expect(plan.sequence).toHaveLength(1);
  });

  test("never reuses a consumed candidate in one plan", async () => {
    const { plan } = await search(
      [jokerBuy("a", 2)],
      state(20),
      (ctx) => ctx.jokers * 5,
    );
    expect(plan.sequence).toEqual([0]);
  });

  test("evaluates in one batch per depth plus the baseline", async () => {
    const { calls } = await search(
      [jokerBuy("a", 2), jokerBuy("b", 2), jokerBuy("c", 2)],
      state(20),
      (ctx) => ctx.jokers,
    );
    expect(calls.length).toBeLessThanOrEqual(7);
    expect(calls[0]).toBe(1);
  });

  test("an empty candidate list returns the leave baseline", async () => {
    const { plan } = await search([], state(10), (ctx) => ctx.money);
    expect(plan).toMatchObject({ firstIndex: null, sequence: [] });
  });
});
