import type { Consumable } from "../items/consumables";
import type { ShopAdviceCandidate } from "./advisor/types";
import { consumableAdviceFields } from "./advisor/consumableAdvice";

export function consumableUseCandidate(consumable: Consumable, index: number): ShopAdviceCandidate {
  return {
    action: "use",
    item: {
      ...consumableAdviceFields(consumable, index),
      description: "",
      cost: 0,
    },
  };
}
