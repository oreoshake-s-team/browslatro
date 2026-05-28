import type { JokerRarity } from "../items/jokers";
import { BASE_REROLL_COST } from "../items/shop";

export type NextShopModifier =
  | { readonly kind: "free-rerolls" }
  | { readonly kind: "free-shop-items" }
  | { readonly kind: "free-joker"; readonly rarity: JokerRarity };

export interface ShopAdjustments {
  readonly rerollReduction: number;
  readonly freeShopItems: boolean;
  readonly freeJokerRarities: ReadonlyArray<JokerRarity>;
}

export function applyNextShopModifiers(
  mods: ReadonlyArray<NextShopModifier>,
): ShopAdjustments {
  let rerollReduction = 0;
  let freeShopItems = false;
  const freeJokerRarities: JokerRarity[] = [];
  for (const mod of mods) {
    if (mod.kind === "free-rerolls") {
      rerollReduction += BASE_REROLL_COST;
    } else if (mod.kind === "free-shop-items") {
      freeShopItems = true;
    } else if (mod.kind === "free-joker") {
      freeJokerRarities.push(mod.rarity);
    }
  }
  return { rerollReduction, freeShopItems, freeJokerRarities };
}
