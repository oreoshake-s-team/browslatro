import { describe, expect, test } from "vitest";
import {
  cardLabel,
  formatScoringEvent,
  isTraceActive,
  type ScoringEvent,
} from "./scoringTrace";
import type { Card } from "../cards/types";

describe("isTraceActive", () => {
  test("returns true when speed is slow", () => {
    expect(isTraceActive("slow")).toBe(true);
  });

  test("returns false on normal speed (negative)", () => {
    expect(isTraceActive("normal")).toBe(false);
  });

  test("returns false on fast speed (negative)", () => {
    expect(isTraceActive("fast")).toBe(false);
  });

  test("returns false on instant speed (negative)", () => {
    expect(isTraceActive("instant")).toBe(false);
  });
});

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
