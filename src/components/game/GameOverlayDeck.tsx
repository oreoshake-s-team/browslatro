import { useMemo } from "react";
import DeckPile from "../cards/DeckPile";
import { useGame } from "../../store/game";
import { useDragController } from "../../hooks/useDragController";
import { useConsumableActions } from "../../hooks/useConsumableActions";
import { play } from "../system/sounds";
import { fullDeckPile } from "../../cards/deckBuild";

export default function GameOverlayDeck() {
  const baseDeckCards = useGame((s) => s.baseDeckCards);
  const destroyedCardIds = useGame((s) => s.destroyedCardIds);
  const addedCards = useGame((s) => s.addedCards);
  const cardEnhancementsById = useGame((s) => s.cardEnhancementsById);
  const cardSealsById = useGame((s) => s.cardSealsById);
  const sellConsumableAction = useGame((s) => s.sellConsumable);
  const sellJokerAction = useGame((s) => s.sellJoker);

  const { useConsumable } = useConsumableActions();

  const dragController = useDragController({
    useConsumable,
    sellConsumable: (consumableIdx: number) => {
      play("pop");
      sellConsumableAction(consumableIdx);
    },
    sellJoker: (jokerIdx: number) => {
      play("pop");
      sellJokerAction(jokerIdx);
    },
  });

  const overlayDeckRemaining = useMemo(
    () =>
      fullDeckPile(
        baseDeckCards,
        destroyedCardIds,
        addedCards,
        cardEnhancementsById,
        cardSealsById,
      ).remaining,
    [
      baseDeckCards,
      destroyedCardIds,
      addedCards,
      cardEnhancementsById,
      cardSealsById,
    ],
  );

  return (
    <div className="game-overlay-deck">
      <DeckPile
        remaining={overlayDeckRemaining}
        consumableDropEnabled={dragController.draggingConsumableIndex !== null}
        onConsumableDrop={dragController.onConsumableDropOnDeck}
        jokerDropEnabled={dragController.draggingJokerIndex !== null}
        onJokerDrop={dragController.onJokerDropOnDeck}
      />
    </div>
  );
}
