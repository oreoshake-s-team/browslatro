import type { Consumable } from "../../items/consumables";
import type { PackOption } from "../../items/packs";
import { categorizePackOption } from "./shopCategory";
import { packOptionAttributes } from "./shopCandidateAttributes";
import type { ShopAdviceItem } from "./types";

export function consumableToPackOption(consumable: Consumable): PackOption {
  if (consumable.kind === "planet") return { kind: "planet", planet: consumable.card };
  if (consumable.kind === "tarot") return { kind: "tarot", tarot: consumable.card };
  return { kind: "spectral", spectral: consumable.card };
}

export type ConsumableAdviceFields = Omit<ShopAdviceItem, "description" | "cost">;

export function consumableAdviceFields(
  consumable: Consumable,
  index: number,
): ConsumableAdviceFields {
  const option = consumableToPackOption(consumable);
  return {
    itemType: consumable.kind,
    category: categorizePackOption(option),
    attributes: packOptionAttributes(option),
    ...(consumable.kind === "planet" ? { advancesHands: consumable.card.hands } : {}),
    id: `use:${consumable.card.id}:${index}`,
    name: consumable.card.name,
  };
}
