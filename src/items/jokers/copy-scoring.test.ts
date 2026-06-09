// @vitest-environment node
import {
  applyHandLevelJokers,
  applyPerCardJokers,
  createBlueprintJoker,
  createBrainstormJoker,
  createGreedyJoker,
  createPlusFourMultJoker,
} from "../jokers";
import type { Card, Rank, Suit } from "../../cards/types";

let nextId = 0;
function card(rank: Rank, suit: Suit = "spades"): Card {
  return { id: ++nextId, rank, suit };
}

beforeEach(() => {
  nextId = 0;
});

describe("Blueprint (copy-right) in scoring", () => {
  test("doubles the hand mult of the additive joker to its right", () => {
    const base = applyHandLevelJokers([createPlusFourMultJoker()]).additiveMult;
    const copied = applyHandLevelJokers([
      createBlueprintJoker(),
      createPlusFourMultJoker(),
    ]).additiveMult;
    expect(copied).toBe(base * 2);
  });

  test("fires under its own id alongside the copied joker", () => {
    const result = applyHandLevelJokers([
      createBlueprintJoker(),
      createPlusFourMultJoker(),
    ]);
    expect(result.firedJokerIds).toEqual(["blueprint", "plus-four-mult"]);
  });

  test("chained Blueprints triple the copied joker's mult", () => {
    const base = applyHandLevelJokers([createPlusFourMultJoker()]).additiveMult;
    const chained = applyHandLevelJokers([
      createBlueprintJoker(),
      createBlueprintJoker(),
      createPlusFourMultJoker(),
    ]).additiveMult;
    expect(chained).toBe(base * 3);
  });

  test("contributes nothing when no joker sits to its right", () => {
    const base = applyHandLevelJokers([createPlusFourMultJoker()]).additiveMult;
    const withBlueprint = applyHandLevelJokers([
      createPlusFourMultJoker(),
      createBlueprintJoker(),
    ]).additiveMult;
    expect(withBlueprint).toBe(base);
  });

  test("doubles a per-card joker's contribution on a matching card", () => {
    const target = card("5", "diamonds");
    const base = applyPerCardJokers([createGreedyJoker()], target).additiveMult;
    const copied = applyPerCardJokers(
      [createBlueprintJoker(), createGreedyJoker()],
      target,
    ).additiveMult;
    expect(copied).toBe(base * 2);
  });

  test("contributes no per-card mult on a non-matching card", () => {
    const result = applyPerCardJokers(
      [createBlueprintJoker(), createGreedyJoker()],
      card("5", "spades"),
    );
    expect(result.additiveMult).toBe(0);
  });
});

describe("Brainstorm (copy-leftmost) in scoring", () => {
  test("doubles the hand mult of the leftmost additive joker", () => {
    const base = applyHandLevelJokers([createPlusFourMultJoker()]).additiveMult;
    const copied = applyHandLevelJokers([
      createPlusFourMultJoker(),
      createBrainstormJoker(),
    ]).additiveMult;
    expect(copied).toBe(base * 2);
  });

  test("contributes nothing when it is the only joker", () => {
    const result = applyHandLevelJokers([createBrainstormJoker()]);
    expect(result.additiveMult).toBe(0);
  });
});
