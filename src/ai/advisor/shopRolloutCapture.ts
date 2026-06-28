import { fullDeckPile } from "../../cards/deckBuild";
import type { Card } from "../../cards/types";
import type { ShopItem } from "../../items/shop";
import type { GameState } from "../../store/game";
import { shopBuildSummary, type ShopBuild } from "./shopEncoding";
import type { ShopRolloutState } from "./types";

function deckFromState(state: GameState): ReadonlyArray<Card> {
  return fullDeckPile(
    state.baseDeckCards,
    state.destroyedCardIds,
    state.addedCards,
    state.cardEnhancementsById,
    state.cardSealsById,
    state.cardEditionsById,
  ).remaining;
}

export function shopBuildFromState(state: GameState): ShopBuild {
  return shopBuildSummary({
    jokers: state.jokers,
    handStats: state.handStats,
    deck: deckFromState(state),
    consumablesHeld: Math.min(state.consumables.length, 1),
  });
}

export function buildShopRolloutState(
  state: GameState,
  offers: ReadonlyArray<ShopItem>,
): ShopRolloutState {
  return {
    jokers: state.jokers,
    handStats: state.handStats,
    deck: deckFromState(state),
    offers,
  };
}
