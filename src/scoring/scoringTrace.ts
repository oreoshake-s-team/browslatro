import type { Card, Suit } from "../cards/types";

const SUIT_SYMBOLS: Readonly<Record<Suit, string>> = {
  spades: "♠",
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
};

export function cardLabel(card: Card): string {
  return `${card.rank}${SUIT_SYMBOLS[card.suit]}`;
}

export type ScoringEvent =
  | {
      readonly kind: "hand-base";
      readonly chips: number;
      readonly mult: number;
      readonly handLabel: string;
      readonly level: number;
    }
  | { readonly kind: "chips-delta"; readonly amount: number; readonly source: string }
  | { readonly kind: "mult-delta"; readonly amount: number; readonly source: string }
  | { readonly kind: "mult-times"; readonly factor: number; readonly source: string }
  | { readonly kind: "money-delta"; readonly amount: number; readonly source: string }
  | { readonly kind: "card-destroyed"; readonly cardLabel: string; readonly source: string }
  | { readonly kind: "boss-adjustment"; readonly description: string; readonly source: string };

function formatSigned(amount: number): string {
  return amount >= 0 ? `+${amount}` : `${amount}`;
}

function formatMoney(amount: number): string {
  return amount >= 0 ? `+$${amount}` : `-$${Math.abs(amount)}`;
}

export interface ScoringHandGroup {
  readonly base:
    | (Extract<ScoringEvent, { kind: "hand-base" }> & { readonly handNumber: number })
    | null;
  readonly events: ReadonlyArray<ScoringEvent>;
}

export interface PartitionedEvents {
  readonly scoring: ReadonlyArray<ScoringEvent>;
  readonly money: ReadonlyArray<Extract<ScoringEvent, { kind: "money-delta" }>>;
}

export function partitionByCategory(
  events: ReadonlyArray<ScoringEvent>,
): PartitionedEvents {
  const scoring: ScoringEvent[] = [];
  const money: Extract<ScoringEvent, { kind: "money-delta" }>[] = [];
  for (const event of events) {
    if (event.kind === "money-delta") {
      money.push(event);
    } else {
      scoring.push(event);
    }
  }
  return { scoring, money };
}

export function groupEventsByHand(
  events: ReadonlyArray<ScoringEvent>,
): ReadonlyArray<ScoringHandGroup> {
  const groups: ScoringHandGroup[] = [];
  let current: { base: ScoringHandGroup["base"]; events: ScoringEvent[] } | null = null;
  let handNumber = 0;
  for (const event of events) {
    if (event.kind === "hand-base") {
      if (current) groups.push({ base: current.base, events: current.events });
      handNumber += 1;
      current = { base: { ...event, handNumber }, events: [] };
    } else {
      if (!current) current = { base: null, events: [] };
      current.events.push(event);
    }
  }
  if (current) groups.push({ base: current.base, events: current.events });
  return groups;
}

export function formatScoringEvent(event: ScoringEvent): string {
  switch (event.kind) {
    case "hand-base":
      return `+${event.chips} Chips, +${event.mult} Mult (${event.handLabel} base, Lv ${event.level})`;
    case "chips-delta":
      return `${formatSigned(event.amount)} Chips (${event.source})`;
    case "mult-delta":
      return `${formatSigned(event.amount)} Mult (${event.source})`;
    case "mult-times":
      return `×${event.factor} Mult (${event.source})`;
    case "money-delta":
      return `${formatMoney(event.amount)} (${event.source})`;
    case "card-destroyed":
      return `${event.cardLabel} destroyed (${event.source})`;
    case "boss-adjustment":
      return `${event.description} (${event.source})`;
  }
}
