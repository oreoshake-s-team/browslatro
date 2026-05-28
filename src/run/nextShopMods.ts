import type { JokerEdition, JokerRarity } from "../items/jokers";
import { BASE_REROLL_COST } from "../items/shop";

export type NextShopModifier =
  | { readonly kind: "free-rerolls" }
  | { readonly kind: "free-shop-items" }
  | { readonly kind: "free-joker"; readonly rarity: JokerRarity }
  | { readonly kind: "extra-voucher" }
  | { readonly kind: "free-edition-joker"; readonly edition: JokerEdition };

export interface ShopAdjustments {
  readonly rerollReduction: number;
  readonly freeShopItems: boolean;
  readonly freeJokerRarities: ReadonlyArray<JokerRarity>;
  readonly extraVouchers: number;
  readonly editionJokers: ReadonlyArray<JokerEdition>;
}

export function applyNextShopModifiers(
  mods: ReadonlyArray<NextShopModifier>,
): ShopAdjustments {
  let rerollReduction = 0;
  let freeShopItems = false;
  const freeJokerRarities: JokerRarity[] = [];
  let extraVouchers = 0;
  const editionJokers: JokerEdition[] = [];
  for (const mod of mods) {
    if (mod.kind === "free-rerolls") {
      rerollReduction += BASE_REROLL_COST;
    } else if (mod.kind === "free-shop-items") {
      freeShopItems = true;
    } else if (mod.kind === "free-joker") {
      freeJokerRarities.push(mod.rarity);
    } else if (mod.kind === "extra-voucher") {
      extraVouchers += 1;
    } else if (mod.kind === "free-edition-joker") {
      editionJokers.push(mod.edition);
    }
  }
  return {
    rerollReduction,
    freeShopItems,
    freeJokerRarities,
    extraVouchers,
    editionJokers,
  };
}
