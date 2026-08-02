import type { Consumable } from "../items/consumables";
import type { PackOption } from "../items/packs";
import type { ShopAdviceCandidate } from "./advisor/types";
import { categorizePackOption } from "./advisor/shopCategory";
import { packOptionAttributes } from "./advisor/shopCandidateAttributes";

function consumableToPackOption(consumable: Consumable): PackOption {
  if (consumable.kind === "planet") return { kind: "planet", planet: consumable.card };
  if (consumable.kind === "tarot") return { kind: "tarot", tarot: consumable.card };
  return { kind: "spectral", spectral: consumable.card };
}

export function consumableUseCandidate(consumable: Consumable, index: number): ShopAdviceCandidate {
  const option = consumableToPackOption(consumable);
  return {
    action: "use",
    item: {
      itemType: consumable.kind,
      category: categorizePackOption(option),
      attributes: packOptionAttributes(option),
      ...(consumable.kind === "planet" ? { advancesHands: consumable.card.hands } : {}),
      id: `use:${consumable.card.id}:${index}`,
      name: consumable.card.name,
      description: "",
      cost: 0,
    },
  };
}
