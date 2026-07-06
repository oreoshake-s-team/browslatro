import { categorizeShopItem } from "../src/ai/advisor/shopCategory";
import { shopItemAttributes } from "../src/ai/advisor/shopCandidateAttributes";
import { packFeatureVector } from "../src/ai/advisor/packFeatures";
import { consumableUseCandidate } from "../src/ai/headlessShopAgent";
import type { Consumable } from "../src/items/consumables";
import type { ShopItem } from "../src/items/shop";

export function shopItemSnapshot(item: ShopItem): { itemType: string; category: string; attributes: number[]; packFeatures?: ReadonlyArray<number>; advancesHands?: ReadonlyArray<string>; id: string; name: string; cost: number } {
  const category = categorizeShopItem(item);
  const attributes = shopItemAttributes(item);
  if (item.kind === "joker") return { itemType: "joker", category, attributes, id: item.joker.id, name: item.joker.name, cost: item.price };
  if (item.kind === "planet") return { itemType: "planet", category, attributes, advancesHands: item.planet.hands, id: item.planet.id, name: item.planet.name, cost: item.price };
  if (item.kind === "tarot") return { itemType: "tarot", category, attributes, id: item.tarot.id, name: item.tarot.name, cost: item.price };
  if (item.kind === "spectral") return { itemType: "spectral", category, attributes, id: item.spectral.id, name: item.spectral.name, cost: item.price };
  if (item.kind === "pack") return { itemType: "pack", category, attributes, packFeatures: packFeatureVector(item.pack.pool, item.pack.variant), id: item.pack.pool, name: item.pack.pool, cost: item.price };
  return { itemType: "playing-card", category, attributes, id: "card", name: "Card", cost: item.price };
}

export function useItemSnapshot(
  consumable: Consumable,
  index: number,
): { itemType: string; category: string; attributes?: ReadonlyArray<number>; advancesHands?: ReadonlyArray<string>; id: string; name: string; cost: number } {
  const candidate = consumableUseCandidate(consumable, index);
  if (candidate.action !== "use") throw new Error("expected a use candidate");
  return candidate.item;
}

export interface ShopCandidateRow {
  readonly itemType: string;
  readonly category: string;
  readonly attributes?: ReadonlyArray<number>;
  readonly packFeatures?: ReadonlyArray<number>;
  readonly advancesHands?: ReadonlyArray<string>;
  readonly id?: string;
  readonly name?: string;
  readonly cost: number;
  readonly isReroll: boolean;
  readonly isLeave: boolean;
  readonly isUse: boolean;
}

export function shopCandidateRows(
  offers: ReadonlyArray<ShopItem>,
  held: ReadonlyArray<Consumable>,
  rerollCost: number | null,
): ShopCandidateRow[] {
  return [
    ...offers.map((o) => ({ ...shopItemSnapshot(o), isReroll: false, isLeave: false, isUse: false })),
    ...held.map((c, i) => {
      const item = useItemSnapshot(c, i);
      return {
        itemType: item.itemType,
        category: item.category,
        attributes: item.attributes,
        ...(item.advancesHands !== undefined ? { advancesHands: item.advancesHands } : {}),
        id: item.id,
        name: item.name,
        cost: 0,
        isReroll: false,
        isLeave: false,
        isUse: true,
      };
    }),
    ...(rerollCost === null
      ? []
      : [{ itemType: "", category: "other", cost: rerollCost, isReroll: true, isLeave: false, isUse: false }]),
    { itemType: "", category: "other", cost: 0, isReroll: false, isLeave: true, isUse: false },
  ];
}

export type ShopActionChoice =
  | { readonly kind: "buy"; readonly index: number }
  | { readonly kind: "use"; readonly index: number }
  | { readonly kind: "reroll" }
  | { readonly kind: "leave" };

export function chosenCandidateIndex(
  offerCount: number,
  heldCount: number,
  rerollIncluded: boolean,
  choice: ShopActionChoice,
): number {
  if (choice.kind === "buy") return choice.index;
  if (choice.kind === "use") return offerCount + choice.index;
  if (choice.kind === "reroll") return offerCount + heldCount;
  return offerCount + heldCount + (rerollIncluded ? 1 : 0);
}
