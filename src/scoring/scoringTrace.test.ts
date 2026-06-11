import { describe, expect, test } from "vitest";
import {
  cardLabel,
  formatScoringEvent,
  groupEventsByHand,
  partitionByCategory,
  resolveHandTotals,
  type ScoringEvent,
} from "./scoringTrace";
import type { Card } from "../cards/types";

describe("cardLabel", () => {
  test.each<{ card: Card; expected: string }>([
    { card: { id: 1, rank: "A", suit: "spades" }, expected: "A♠" },
    { card: { id: 2, rank: "10", suit: "hearts" }, expected: "10♥" },
    { card: { id: 3, rank: "Q", suit: "diamonds" }, expected: "Q♦" },
    { card: { id: 4, rank: "7", suit: "clubs" }, expected: "7♣" },
  ])("renders $expected for the corresponding rank and suit", ({ card, expected }) => {
    expect(cardLabel(card)).toBe(expected);
  });
});

describe("formatScoringEvent", () => {
  test("formats a hand-base event with level", () => {
    const event: ScoringEvent = {
      kind: "hand-base",
      chips: 10,
      mult: 2,
      handLabel: "Pair",
      level: 2,
    };
    expect(formatScoringEvent(event)).toBe(
      "+10 Chips, +2 Mult (Pair base, Lv 2)",
    );
  });

  test("formats a hand-base event for a level-1 High Card", () => {
    const event: ScoringEvent = {
      kind: "hand-base",
      chips: 5,
      mult: 1,
      handLabel: "High Card",
      level: 1,
    };
    expect(formatScoringEvent(event)).toBe(
      "+5 Chips, +1 Mult (High Card base, Lv 1)",
    );
  });

  test("formats a positive chips delta", () => {
    const event: ScoringEvent = {
      kind: "chips-delta",
      amount: 11,
      source: "A♠ rank",
    };
    expect(formatScoringEvent(event)).toBe("+11 Chips (A♠ rank)");
  });

  test("formats a positive mult delta", () => {
    const event: ScoringEvent = {
      kind: "mult-delta",
      amount: 4,
      source: "Mult enhancement",
    };
    expect(formatScoringEvent(event)).toBe("+4 Mult (Mult enhancement)");
  });

  test("formats a mult-times factor", () => {
    const event: ScoringEvent = {
      kind: "mult-times",
      factor: 2,
      source: "Glass enhancement",
    };
    expect(formatScoringEvent(event)).toBe("×2 Mult (Glass enhancement)");
  });

  test("formats a positive money delta", () => {
    const event: ScoringEvent = {
      kind: "money-delta",
      amount: 3,
      source: "Gold Seal on 7♣",
    };
    expect(formatScoringEvent(event)).toBe("+$3 (Gold Seal on 7♣)");
  });

  test("formats a negative money delta with leading minus", () => {
    const event: ScoringEvent = {
      kind: "money-delta",
      amount: -5,
      source: "The Tooth penalty",
    };
    expect(formatScoringEvent(event)).toBe("-$5 (The Tooth penalty)");
  });

  test("formats a card destroyed event", () => {
    const event: ScoringEvent = {
      kind: "card-destroyed",
      cardLabel: "5♠",
      source: "Glass roll",
    };
    expect(formatScoringEvent(event)).toBe("5♠ destroyed (Glass roll)");
  });

  test("formats a hand-upgraded event naming the hand, level and source", () => {
    const event: ScoringEvent = {
      kind: "hand-upgraded",
      handLabel: "Pair",
      level: 3,
      source: "Space Joker",
    };
    expect(formatScoringEvent(event)).toBe(
      "Pair upgraded to Lv 3 (Space Joker)",
    );
  });

  test("groups thousands in a hand-base event with a comma", () => {
    const event: ScoringEvent = {
      kind: "hand-base",
      chips: 1200,
      mult: 16,
      handLabel: "Flush",
      level: 8,
    };
    expect(formatScoringEvent(event)).toBe(
      "+1,200 Chips, +16 Mult (Flush base, Lv 8)",
    );
  });

  test("groups thousands in a chips delta with a comma", () => {
    const event: ScoringEvent = {
      kind: "chips-delta",
      amount: 1500,
      source: "Bull",
    };
    expect(formatScoringEvent(event)).toBe("+1,500 Chips (Bull)");
  });

  test("formats a boss-adjustment event", () => {
    const event: ScoringEvent = {
      kind: "boss-adjustment",
      description: "Pair adjusted to 5 × 1 (Lv 1)",
      source: "The Flint",
    };
    expect(formatScoringEvent(event)).toBe(
      "Pair adjusted to 5 × 1 (Lv 1) (The Flint)",
    );
  });
});

describe("groupEventsByHand", () => {
  test("returns no groups for an empty event list", () => {
    expect(groupEventsByHand([])).toEqual([]);
  });

  test("starts a new group at each hand-base event", () => {
    const events: ReadonlyArray<ScoringEvent> = [
      { kind: "hand-base", chips: 10, mult: 2, handLabel: "Pair", level: 1 },
      { kind: "chips-delta", amount: 11, source: "A♠ rank" },
      { kind: "hand-base", chips: 30, mult: 4, handLabel: "Three of a Kind", level: 1 },
      { kind: "chips-delta", amount: 5, source: "5♣ rank" },
    ];
    expect(groupEventsByHand(events)).toHaveLength(2);
  });

  test("assigns 1-based handNumber to each group's base", () => {
    const events: ReadonlyArray<ScoringEvent> = [
      { kind: "hand-base", chips: 10, mult: 2, handLabel: "Pair", level: 1 },
      { kind: "hand-base", chips: 30, mult: 4, handLabel: "Three of a Kind", level: 1 },
    ];
    const groups = groupEventsByHand(events);
    expect(groups[0].base?.handNumber).toBe(1);
  });

  test("assigns handNumber 2 to the second hand group (negative ordering check)", () => {
    const events: ReadonlyArray<ScoringEvent> = [
      { kind: "hand-base", chips: 10, mult: 2, handLabel: "Pair", level: 1 },
      { kind: "hand-base", chips: 30, mult: 4, handLabel: "Three of a Kind", level: 1 },
    ];
    const groups = groupEventsByHand(events);
    expect(groups[1].base?.handNumber).toBe(2);
  });

  test("attaches non-hand-base events to the preceding group", () => {
    const events: ReadonlyArray<ScoringEvent> = [
      { kind: "hand-base", chips: 10, mult: 2, handLabel: "Pair", level: 1 },
      { kind: "chips-delta", amount: 11, source: "A♠ rank" },
      { kind: "chips-delta", amount: 11, source: "A♥ rank" },
    ];
    const groups = groupEventsByHand(events);
    expect(groups[0].events).toHaveLength(2);
  });

  test("creates a base-less leading group when events arrive before any hand-base (negative)", () => {
    const events: ReadonlyArray<ScoringEvent> = [
      { kind: "chips-delta", amount: 5, source: "orphan" },
      { kind: "hand-base", chips: 10, mult: 2, handLabel: "Pair", level: 1 },
    ];
    const groups = groupEventsByHand(events);
    expect(groups[0].base).toBeNull();
  });
});

describe("resolveHandTotals", () => {
  test("returns null for a base-less group (negative)", () => {
    const [group] = groupEventsByHand([
      { kind: "chips-delta", amount: 5, source: "orphan" },
    ]);
    expect(resolveHandTotals(group)).toBeNull();
  });

  test("adds chips-delta events to the base chips", () => {
    const [group] = groupEventsByHand([
      { kind: "hand-base", chips: 10, mult: 2, handLabel: "Pair", level: 1 },
      { kind: "chips-delta", amount: 11, source: "A♠ rank" },
    ]);
    expect(resolveHandTotals(group)?.chips).toBe(21);
  });

  test("adds mult-delta events to the base mult", () => {
    const [group] = groupEventsByHand([
      { kind: "hand-base", chips: 10, mult: 2, handLabel: "Pair", level: 1 },
      { kind: "mult-delta", amount: 4, source: "Mult enhancement" },
    ]);
    expect(resolveHandTotals(group)?.mult).toBe(6);
  });

  test("multiplies mult by mult-times factors", () => {
    const [group] = groupEventsByHand([
      { kind: "hand-base", chips: 10, mult: 3, handLabel: "Pair", level: 1 },
      { kind: "mult-times", factor: 2, source: "Glass" },
    ]);
    expect(resolveHandTotals(group)?.mult).toBe(6);
  });

  test("floors the chips × mult product into the total", () => {
    const [group] = groupEventsByHand([
      { kind: "hand-base", chips: 10, mult: 2, handLabel: "Pair", level: 1 },
      { kind: "mult-times", factor: 1.5, source: "Glass" },
    ]);
    expect(resolveHandTotals(group)?.total).toBe(30);
  });

  test("ignores money-delta events when resolving totals (negative)", () => {
    const [group] = groupEventsByHand([
      { kind: "hand-base", chips: 10, mult: 2, handLabel: "Pair", level: 1 },
      { kind: "money-delta", amount: 99, source: "Gold card" },
    ]);
    expect(resolveHandTotals(group)?.total).toBe(20);
  });
});

describe("partitionByCategory", () => {
  test("returns empty scoring and money for an empty input", () => {
    expect(partitionByCategory([])).toEqual({ scoring: [], money: [] });
  });

  test("routes money-delta events into the money bucket", () => {
    const events: ReadonlyArray<ScoringEvent> = [
      { kind: "money-delta", amount: 3, source: "Gold card" },
      { kind: "money-delta", amount: 1, source: "Interest" },
    ];
    expect(partitionByCategory(events).money).toHaveLength(2);
  });

  test("routes chip/mult events into the scoring bucket", () => {
    const events: ReadonlyArray<ScoringEvent> = [
      { kind: "chips-delta", amount: 11, source: "A♠ rank" },
      { kind: "mult-times", factor: 2, source: "Glass" },
    ];
    expect(partitionByCategory(events).scoring).toHaveLength(2);
  });

  test("does not include money-delta events in the scoring bucket (negative)", () => {
    const events: ReadonlyArray<ScoringEvent> = [
      { kind: "chips-delta", amount: 11, source: "A♠ rank" },
      { kind: "money-delta", amount: 3, source: "Gold card" },
    ];
    expect(partitionByCategory(events).scoring).toHaveLength(1);
  });

  test("does not include scoring events in the money bucket (negative)", () => {
    const events: ReadonlyArray<ScoringEvent> = [
      { kind: "chips-delta", amount: 11, source: "A♠ rank" },
      { kind: "money-delta", amount: 3, source: "Gold card" },
    ];
    expect(partitionByCategory(events).money).toHaveLength(1);
  });

  test("preserves source order within the money bucket", () => {
    const events: ReadonlyArray<ScoringEvent> = [
      { kind: "money-delta", amount: 3, source: "Gold card" },
      { kind: "chips-delta", amount: 11, source: "A♠ rank" },
      { kind: "money-delta", amount: 1, source: "Interest" },
    ];
    expect(partitionByCategory(events).money.map((e) => e.source)).toEqual([
      "Gold card",
      "Interest",
    ]);
  });
});
