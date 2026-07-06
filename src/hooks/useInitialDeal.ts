import { useEffect } from "react";
import { didRestoreFromSnapshot } from "../save/restore";
import { createDeck, resetCardIds } from "../cards/deck";
import { initialDeal } from "../cards/deckBuild";
import { useGame } from "../store/game";

export function useInitialDeal(): void {
  const setDealt = useGame((state) => state.setDealt);
  const setBaseDeckCards = useGame((state) => state.setBaseDeckCards);

  useEffect(() => {
    if (didRestoreFromSnapshot()) return;
    resetCardIds();
    const fresh = createDeck();
    setBaseDeckCards(fresh);
    const s = useGame.getState();
    setDealt(
      initialDeal(
        fresh,
        s.destroyedCardIds,
        undefined,
        s.addedCards,
        s.cardEnhancementsById,
        s.cardSealsById,
        s.cardEditionsById,
      ),
    );
  }, [setDealt, setBaseDeckCards]);
}
