// @vitest-environment node
import { describe, expect, test } from "vitest";
import type { Card, Rank, Suit } from "../../cards/types";
import type { HandLabel } from "../../scoring/handEvaluator";
import { createJokerCatalog } from "./catalog";
import { withEdition } from "./editions";
import {
  createBlueprintJoker,
  createCavendishJoker,
  createJokerStencilJoker,
  createJollyJoker,
  createPhotographJoker,
  createPlusFourMultJoker,
  createSlyJoker,
  createTheDuoJoker,
} from "./factories";
import {
  additiveFirstInversions,
  chooseOptimalJokerOrder,
  hasCopyJoker,
  orderJokersForScoring,
  producesXMult,
} from "./jokerOrdering";
import type { Joker } from "./types";
import { applyHandLevelJokers } from "./scoring/handLevel";

function card(rank: Rank, suit: Suit, id: number): Card {
  return { id, rank, suit };
}

describe("producesXMult", () => {
  test("flags a flat x-mult joker", () => {
    expect(producesXMult(createCavendishJoker())).toBe(true);
  });

  test("flags an on-hand-type x-mult joker", () => {
    expect(producesXMult(createTheDuoJoker())).toBe(true);
  });

  test("flags a per-card x-mult joker", () => {
    expect(producesXMult(createPhotographJoker())).toBe(true);
  });

  test("flags the stencil joker", () => {
    expect(producesXMult(createJokerStencilJoker())).toBe(true);
  });

  test("flags a polychrome-edition additive joker", () => {
    expect(producesXMult(withEdition(createPlusFourMultJoker(), "polychrome"))).toBe(true);
  });

  test("does not flag an additive-mult joker", () => {
    expect(producesXMult(createPlusFourMultJoker())).toBe(false);
  });

  test("does not flag an on-hand-type additive-mult joker", () => {
    expect(producesXMult(createJollyJoker())).toBe(false);
  });

  test("does not flag a chips joker", () => {
    expect(producesXMult(createSlyJoker())).toBe(false);
  });

  test("never classifies an engine-x-mult catalog joker as additive", () => {
    const scored = [
      card("K", "hearts", 1),
      card("Q", "spades", 2),
      card("J", "clubs", 3),
      card("10", "diamonds", 4),
      card("A", "hearts", 5),
    ];
    const ctx = {
      playedHandLabel: "Flush" as HandLabel,
      playedCardCount: 5,
      scoredCards: scored,
      heldInHandCards: [],
      money: 20,
      remainingHands: 3,
      remainingDiscards: 3,
      rng: () => 0,
    };
    const missed = createJokerCatalog()
      .filter((joker) => {
        const result = applyHandLevelJokers([joker], ctx);
        const engineXMult =
          result.xMult !== 1 || result.steps.some((s) => s.xMultFactor !== undefined);
        return engineXMult && !producesXMult(joker);
      })
      .map((joker) => joker.id);
    expect(missed).toEqual([]);
  });
});

describe("orderJokersForScoring", () => {
  test("places additive jokers before x-mult jokers", () => {
    const ordered = orderJokersForScoring([createTheDuoJoker(), createJollyJoker()]);
    expect(producesXMult(ordered[0])).toBe(false);
  });

  test("places x-mult jokers last", () => {
    const ordered = orderJokersForScoring([createTheDuoJoker(), createJollyJoker()]);
    expect(producesXMult(ordered[ordered.length - 1])).toBe(true);
  });

  test("keeps relative order within the additive group", () => {
    const ordered = orderJokersForScoring([createJollyJoker(), createSlyJoker()]);
    expect(ordered.map((j) => j.id)).toEqual([
      createJollyJoker().id,
      createSlyJoker().id,
    ]);
  });

  test("preserves the original order when a copy joker is present", () => {
    const copy = createJokerCatalog().find(
      (j) => j.effect.kind === "copy-right-joker" || j.effect.kind === "copy-leftmost-joker",
    );
    expect(copy).toBeDefined();
    if (copy === undefined) return;
    const input = [createTheDuoJoker(), copy, createJollyJoker()];
    expect(orderJokersForScoring(input)).toEqual(input);
  });
});

describe("hasCopyJoker", () => {
  test("detects a copy joker in the loadout", () => {
    expect(hasCopyJoker([createBlueprintJoker(), createJollyJoker()])).toBe(true);
  });

  test("returns false without a copy joker", () => {
    expect(hasCopyJoker([createCavendishJoker(), createJollyJoker()])).toBe(false);
  });
});

describe("additiveFirstInversions", () => {
  test("counts none for an additive-before-x-mult order", () => {
    expect(
      additiveFirstInversions([createJollyJoker(), createCavendishJoker()]),
    ).toBe(0);
  });

  test("counts one for an x-mult-before-additive order", () => {
    expect(
      additiveFirstInversions([createCavendishJoker(), createJollyJoker()]),
    ).toBe(1);
  });
});

describe("chooseOptimalJokerOrder", () => {
  test("skips the exact search when no copy joker is present", () => {
    let calls = 0;
    chooseOptimalJokerOrder([createCavendishJoker(), createJollyJoker()], () => {
      calls += 1;
      return 0;
    });
    expect(calls).toBe(0);
  });

  test("falls back to the partition when no copy joker is present", () => {
    const ordered = chooseOptimalJokerOrder(
      [createCavendishJoker(), createJollyJoker()],
      () => 0,
    );
    expect(producesXMult(ordered[ordered.length - 1])).toBe(true);
  });

  test("selects the highest-scoring permutation when a copy joker is present", () => {
    const blueprint = createBlueprintJoker();
    const cavendish = createCavendishJoker();
    const jolly = createJollyJoker();
    const rank = new Map<string, number>([
      [cavendish.id, 3],
      [blueprint.id, 2],
      [jolly.id, 1],
    ]);
    const scoreOf = (order: ReadonlyArray<Joker>): number =>
      order.reduce(
        (sum, joker, i) => sum + (rank.get(joker.id) ?? 0) * (order.length - i),
        0,
      );
    const ordered = chooseOptimalJokerOrder([jolly, blueprint, cavendish], scoreOf);
    expect(ordered.map((j) => j.id)).toEqual([
      cavendish.id,
      blueprint.id,
      jolly.id,
    ]);
  });

  test("breaks score ties toward the additive-before-x-mult shape", () => {
    const ordered = chooseOptimalJokerOrder(
      [createCavendishJoker(), createBlueprintJoker(), createJollyJoker()],
      () => 0,
    );
    expect(producesXMult(ordered[ordered.length - 1])).toBe(true);
  });
});
