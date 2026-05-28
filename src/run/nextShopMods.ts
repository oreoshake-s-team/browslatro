import { BASE_REROLL_COST } from "../items/shop";

export type NextShopModifier = { readonly kind: "free-rerolls" };

export interface ShopAdjustments {
  readonly rerollReduction: number;
}

export function applyNextShopModifiers(
  mods: ReadonlyArray<NextShopModifier>,
): ShopAdjustments {
  let rerollReduction = 0;
  for (const mod of mods) {
    if (mod.kind === "free-rerolls") {
      rerollReduction += BASE_REROLL_COST;
    }
  }
  return { rerollReduction };
}
