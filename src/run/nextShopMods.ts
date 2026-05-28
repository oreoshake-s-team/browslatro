import { BASE_REROLL_COST } from "../items/shop";

export type NextShopModifier =
  | { readonly kind: "free-rerolls" }
  | { readonly kind: "free-shop-items" };

export interface ShopAdjustments {
  readonly rerollReduction: number;
  readonly freeShopItems: boolean;
}

export function applyNextShopModifiers(
  mods: ReadonlyArray<NextShopModifier>,
): ShopAdjustments {
  let rerollReduction = 0;
  let freeShopItems = false;
  for (const mod of mods) {
    if (mod.kind === "free-rerolls") {
      rerollReduction += BASE_REROLL_COST;
    } else if (mod.kind === "free-shop-items") {
      freeShopItems = true;
    }
  }
  return { rerollReduction, freeShopItems };
}
