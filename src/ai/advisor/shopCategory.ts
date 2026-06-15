import type { PackOption } from "../../items/packs";
import type { ShopItem } from "../../items/shop";
import type { TarotEffect } from "../../items/tarots";
import { jokerEffectCategory } from "../encode";

export const SHOP_CANDIDATE_CATEGORIES = [
  "joker-mult",
  "joker-x-mult",
  "joker-retrigger",
  "joker-money",
  "joker-passive",
  "planet",
  "tarot-enhance",
  "tarot-economy",
  "tarot-create",
  "tarot-deck",
  "spectral",
  "other",
] as const;

export type ShopCandidateCategory = (typeof SHOP_CANDIDATE_CATEGORIES)[number];

function tarotEffectCategory(effect: TarotEffect): ShopCandidateCategory {
  switch (effect.kind) {
    case "apply-enhancement":
      return "tarot-enhance";
    case "money-multiply":
    case "joker-sell-value-payout":
      return "tarot-economy";
    case "create-joker":
    case "create-consumables":
    case "copy-last-consumable":
      return "tarot-create";
    default:
      return "tarot-deck";
  }
}

export function categorizeShopItem(item: ShopItem): ShopCandidateCategory {
  switch (item.kind) {
    case "joker":
      return `joker-${jokerEffectCategory(item.joker.effect.kind)}`;
    case "planet":
      return "planet";
    case "tarot":
      return tarotEffectCategory(item.tarot.effect);
    case "spectral":
      return "spectral";
    default:
      return "other";
  }
}

export function categorizePackOption(opt: PackOption): ShopCandidateCategory {
  switch (opt.kind) {
    case "joker":
      return `joker-${jokerEffectCategory(opt.joker.effect.kind)}`;
    case "planet":
      return "planet";
    case "tarot":
      return tarotEffectCategory(opt.tarot.effect);
    case "spectral":
      return "spectral";
    default:
      return "other";
  }
}
