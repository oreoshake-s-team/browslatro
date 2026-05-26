import type { PlanetCard } from "./planets";
import type { TarotCard } from "./tarots";

export const MAX_CONSUMABLE_SLOTS = 2;

export type Consumable =
  | { readonly kind: "planet"; readonly card: PlanetCard }
  | { readonly kind: "tarot"; readonly card: TarotCard };

export function hasFreeConsumableSlot(
  consumables: ReadonlyArray<Consumable>,
  capacity: number = MAX_CONSUMABLE_SLOTS,
): boolean {
  return consumables.length < capacity;
}

export function addConsumable(
  consumables: ReadonlyArray<Consumable>,
  next: Consumable,
  capacity: number = MAX_CONSUMABLE_SLOTS,
): ReadonlyArray<Consumable> {
  if (!hasFreeConsumableSlot(consumables, capacity)) return consumables;
  return [...consumables, next];
}

export function removeConsumableAt(
  consumables: ReadonlyArray<Consumable>,
  index: number,
): ReadonlyArray<Consumable> {
  if (index < 0 || index >= consumables.length) return consumables;
  return consumables.filter((_, i) => i !== index);
}

export function consumableLabel(c: Consumable): string {
  return c.kind === "planet" ? c.card.name : c.card.name;
}

export function consumableDescription(c: Consumable): string {
  return c.kind === "planet" ? c.card.description : c.card.description;
}
