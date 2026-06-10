import { enhancementsInFullDeck } from "../cards/deckBuild";
import {
  availableJokers,
  createJokerCatalog,
  type Joker,
} from "../items/jokers";
import type { DeckState } from "./deck";

type DeckCards = Pick<
  DeckState,
  "baseDeckCards" | "destroyedCardIds" | "addedCards" | "cardEnhancementsById"
>;

export function availableJokerCatalog(s: DeckCards): Joker[] {
  return availableJokers(
    createJokerCatalog(),
    enhancementsInFullDeck(
      s.baseDeckCards,
      s.destroyedCardIds,
      s.addedCards,
      s.cardEnhancementsById,
    ),
  );
}
