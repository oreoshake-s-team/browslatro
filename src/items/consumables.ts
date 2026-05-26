import { PLANET_BASE_PRICE, type PlanetCard } from "./planets";
import { SPECTRAL_BASE_PRICE, type SpectralCard } from "./spectrals";
import { TAROT_BASE_PRICE, type TarotCard } from "./tarots";

export const MAX_CONSUMABLE_SLOTS = 2;

export type Consumable =
  | { readonly kind: "planet"; readonly card: PlanetCard }
  | { readonly kind: "tarot"; readonly card: TarotCard }
  | { readonly kind: "spectral"; readonly card: SpectralCard };

export function consumableSellValue(c: Consumable): number {
  const base =
    c.kind === "planet"
      ? PLANET_BASE_PRICE
      : c.kind === "tarot"
        ? TAROT_BASE_PRICE
        : SPECTRAL_BASE_PRICE;
  return Math.floor(base / 2);
}

function checkSelection(
  selectedCount: number,
  maxTargets: number,
): string | null {
  if (selectedCount === 0) {
    return maxTargets === 1
      ? "Select 1 card in your hand first"
      : `Select 1–${maxTargets} cards in your hand first`;
  }
  if (selectedCount > maxTargets) {
    return `Too many cards selected (max ${maxTargets})`;
  }
  return null;
}

export function consumableUseBlock(
  c: Consumable,
  selectedCount: number,
): string | null {
  if (c.kind === "planet") return null;
  if (c.kind === "tarot") {
    const effect = c.card.effect;
    if (effect.kind !== "apply-enhancement") return null;
    return checkSelection(selectedCount, effect.maxTargets);
  }
  const effect = c.card.effect;
  if (effect.kind !== "apply-seal") return null;
  return checkSelection(selectedCount, effect.maxTargets);
}

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
  return c.card.description;
}
