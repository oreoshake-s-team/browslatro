import { describe, expect, test } from "vitest";
import {
  cardLabel,
  formatScoringEvent,
  groupEventsByHand,
  type ScoringEvent,
} from "./scoringTrace";
import type { Card } from "../cards/types";

describe("cardLabel", () => {
  test("renders rank and suit symbol for an Ace of Spades", () => {
    const card: Card = { id: 1, rank: "A", suit: "spades" };
    expect(cardLabel(card)).toBe("A♠");
  });

  test("renders for a 10 of Hearts", () => {
    const card: Card = { id: 2, rank: "10", suit: "hearts" };
    expect(cardLabel(card)).toBe("10♥");
  });

  test("renders for a Queen of Diamonds", () => {
    const card: Card = { id: 3, rank: "Q", suit: "diamonds" };
    expect(cardLabel(card)).toBe("Q♦");
  });

  test("renders for a 7 of Clubs", () => {
    const card: Card = { id: 4, rank: "7", suit: "clubs" };
    expect(cardLabel(card)).toBe("7♣");
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
