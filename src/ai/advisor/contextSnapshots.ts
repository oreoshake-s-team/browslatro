import type { Consumable } from "../../items/consumables";
import type { Joker } from "../../items/jokers";
import { packPickLimit, type PackOption } from "../../items/packs";
import type { ShopItem } from "../../items/shop";
import { categorizePackOption, categorizeShopItem } from "./shopCategory";
import type {
  NamedRef,
  PackAdviceOption,
  ShopAdviceItem,
} from "./types";

interface Described {
  readonly id: string;
  readonly name: string;
  readonly description: string;
}

export function playingCardDescribed(card: {
  readonly id: number;
  readonly rank: string;
  readonly suit: string;
  readonly enhancement?: string | null;
  readonly edition?: string | null;
  readonly seal?: string | null;
}): Described {
  const traits = [
    card.enhancement && `${card.enhancement} enhancement`,
    card.edition && `${card.edition} edition`,
    card.seal && `${card.seal} seal`,
  ].filter((trait): trait is string => Boolean(trait));
  return {
    id: String(card.id),
    name: `${card.rank} of ${card.suit}`,
    description:
      traits.length === 0
        ? "Adds this playing card to your deck"
        : `Adds this playing card to your deck (${traits.join(", ")})`,
  };
}

function shopItemDescribed(offer: ShopItem): { itemType: string; item: Described } {
  switch (offer.kind) {
    case "joker":
      return { itemType: "joker", item: offer.joker };
    case "planet":
      return { itemType: "planet", item: offer.planet };
    case "tarot":
      return { itemType: "tarot", item: offer.tarot };
    case "spectral":
      return { itemType: "spectral", item: offer.spectral };
    case "playing-card":
      return { itemType: "playing-card", item: playingCardDescribed(offer.card) };
    case "pack":
      return {
        itemType: "pack",
        item: {
          id: `${offer.pack.pool}-${offer.pack.variant}`,
          name: `${offer.pack.variant} ${offer.pack.pool} pack`,
          description: `Opens to pick ${packPickLimit(offer.pack.variant)} of ${offer.pack.options.length} options`,
        },
      };
  }
}

export function shopAdviceItem(offer: ShopItem, cost: number): ShopAdviceItem {
  const { itemType, item } = shopItemDescribed(offer);
  return {
    itemType,
    category: categorizeShopItem(offer),
    id: item.id,
    name: item.name,
    description: item.description,
    cost,
  };
}

export function voucherAdviceItem(
  voucher: Described,
  cost: number,
): ShopAdviceItem {
  return {
    itemType: "voucher",
    category: "other",
    id: voucher.id,
    name: voucher.name,
    description: voucher.description,
    cost,
  };
}

function packOptionDescribed(option: PackOption): {
  optionType: string;
  item: Described;
} {
  switch (option.kind) {
    case "planet":
      return { optionType: "planet", item: option.planet };
    case "tarot":
      return { optionType: "tarot", item: option.tarot };
    case "joker":
      return { optionType: "joker", item: option.joker };
    case "spectral":
      return { optionType: "spectral", item: option.spectral };
    case "playing-card":
      return {
        optionType: "playing-card",
        item: playingCardDescribed(option.card),
      };
  }
}

export function packAdviceOption(option: PackOption): PackAdviceOption {
  const { optionType, item } = packOptionDescribed(option);
  return {
    optionType,
    category: categorizePackOption(option),
    id: item.id,
    name: item.name,
    description: item.description,
  };
}

export function jokerRefs(jokers: ReadonlyArray<Joker>): ReadonlyArray<NamedRef> {
  return jokers.map((joker) => ({ id: joker.id, name: joker.name }));
}

export function consumableRefs(
  consumables: ReadonlyArray<Consumable>,
): ReadonlyArray<NamedRef> {
  return consumables.map((consumable) => ({
    id: consumable.card.id,
    name: consumable.card.name,
  }));
}
