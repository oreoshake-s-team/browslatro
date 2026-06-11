// @vitest-environment node
import {
  applyHandLevelJokers,
  applyPerCardJokers,
  createBlueprintJoker,
  createBrainstormJoker,
  createGreedyJoker,
  createPlusFourMultJoker,
  createRideTheBusJoker,
  RIDE_THE_BUS_MULT_PER_FACELESS_HAND,
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

describe("copy jokers reading target joker state", () => {
  test("Brainstorm copying Ride the Bus contributes the target's accumulated mult", () => {
    const stacked = { ...createRideTheBusJoker(), state: { kind: "counter" as const, value: 3 } };
    const result = applyHandLevelJokers([stacked, createBrainstormJoker()]);
    expect(result.additiveMult).toBe(RIDE_THE_BUS_MULT_PER_FACELESS_HAND * 3 * 2);
  });

  test("Blueprint copying Ride the Bus contributes the target's accumulated mult", () => {
    const stacked = { ...createRideTheBusJoker(), state: { kind: "counter" as const, value: 4 } };
    const result = applyHandLevelJokers([createBlueprintJoker(), stacked]);
    expect(result.additiveMult).toBe(RIDE_THE_BUS_MULT_PER_FACELESS_HAND * 4 * 2);
  });

  test("Brainstorm copying a zero-state Ride the Bus contributes 0 mult (negative)", () => {
    const result = applyHandLevelJokers([createRideTheBusJoker(), createBrainstormJoker()]);
    expect(result.additiveMult).toBe(0);
  });

  test("Brainstorm alone with no other jokers contributes 0 stateful mult (negative)", () => {
    const result = applyHandLevelJokers([createBrainstormJoker()]);
    expect(result.additiveMult).toBe(0);
  });
});
