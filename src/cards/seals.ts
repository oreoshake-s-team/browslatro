import type { Card, Seal } from "./types";
import type { HandLabel } from "../scoring/handEvaluator";
import { createPlanetCatalog, type PlanetCard } from "../items/planets";
import { createTarotCatalog, type TarotCard } from "../items/tarots";

export const GOLD_SEAL_BONUS = 3;

export const SEAL_KINDS: ReadonlyArray<Seal> = ["gold", "red", "blue", "purple"];

export interface SealInfo {
  readonly name: string;
  readonly description: string;
}

const SEAL_INFO: Record<Seal, SealInfo> = {
  gold: { name: "Gold Seal", description: `+$${GOLD_SEAL_BONUS} when scored` },
  red: { name: "Red Seal", description: "Retriggers this card once when scored" },
  blue: { name: "Blue Seal", description: "Creates the Planet for the played hand if held at end of round" },
  purple: { name: "Purple Seal", description: "Creates a random Tarot when discarded" },
};

export function getSealInfo(seal: Seal): SealInfo {
  return SEAL_INFO[seal];
}

export function expandRedSealRetriggers(cards: ReadonlyArray<Card>): Card[] {
  const expanded: Card[] = [];
  for (const card of cards) {
    expanded.push(card);
    if (card.seal === "red") expanded.push(card);
  }
  return expanded;
}

export function goldSealMoney(card: Card): number {
  return card.seal === "gold" ? GOLD_SEAL_BONUS : 0;
}

export function blueSealHeldCards(
  hand: ReadonlyArray<Card>,
  submittedIds: ReadonlySet<number>,
): Card[] {
  return hand.filter((c) => c.seal === "blue" && !submittedIds.has(c.id));
}

export function purpleSealDiscarded(
  hand: ReadonlyArray<Card>,
  discardedIds: ReadonlySet<number>,
): Card[] {
  return hand.filter((c) => c.seal === "purple" && discardedIds.has(c.id));
}

export function planetForHand(label: HandLabel): PlanetCard | undefined {
  return createPlanetCatalog().find((p) => p.hands.includes(label));
}

export function pickRandomTarot(rng: () => number = Math.random): TarotCard {
  const catalog = createTarotCatalog();
  return catalog[Math.floor(rng() * catalog.length)];
}
