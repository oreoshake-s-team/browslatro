import { fullDeckPile } from "../../cards/deckBuild";
import type { ShopItem } from "../../items/shop";
import type { GameState } from "../../store/game";
import type { ShopRolloutState } from "./types";

export function buildShopRolloutState(
  state: GameState,
  offers: ReadonlyArray<ShopItem>,
): ShopRolloutState {
  return {
    jokers: state.jokers,
    handStats: state.handStats,
    deck: fullDeckPile(
      state.baseDeckCards,
      state.destroyedCardIds,
      state.addedCards,
      state.cardEnhancementsById,
      state.cardSealsById,
      state.cardEditionsById,
    ).remaining,
    offers,
  };
}
