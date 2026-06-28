// @vitest-environment node
import { describe, expect, test } from "vitest";
import type { Card, Rank, Suit } from "../../cards/types";
import type { HandLabel } from "../../scoring/handEvaluator";
import { createJokerCatalog } from "./catalog";
import { withEdition } from "./editions";
import {
  createCavendishJoker,
  createJokerStencilJoker,
  createJollyJoker,
  createPhotographJoker,
  createPlusFourMultJoker,
  createSlyJoker,
  createTheDuoJoker,
} from "./factories";
import { orderJokersForScoring, producesXMult } from "./jokerOrdering";
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
