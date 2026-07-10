import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { Card } from "../../cards/types";
import HandComponent from "../cards/Hand";
import { useGame } from "../../store/game";
import { useDragController } from "../../hooks/useDragController";
import { useConsumableActions } from "../../hooks/useConsumableActions";
import { play } from "../system/sounds";
import { announce } from "../system/LiveAnnouncer";
import { bossForcesCardSelection, debuffedHandIds } from "../../items/bosses";
import { useGameSession } from "./gameSession";

export default function HandSection() {
  const {
    currentScoringId: scoringId,
    currentGoldScoringId: goldScoringId,
    currentSteelScoringId: steelScoringId,
    handleCardDiscardEnd: onCardDiscardEnd,
  } = useGameSession();
  const { t } = useTranslation();
  const hand = useGame((s) => s.dealt.hand);
  const remaining = useGame((s) => s.dealt.remaining);
  const destroyedCardIds = useGame((s) => s.destroyedCardIds);
  const selectedIds = useGame((s) => s.selectedIds);
  const discardingIds = useGame((s) => s.discardingIds);
  const newlyDrawnIds = useGame((s) => s.newlyDrawnIds);
  const scoringPulseTick = useGame((s) => s.scoringIndex);
  const luckyMultProcIds = useGame((s) => s.luckyMultProcIds);
  const luckyMoneyProcIds = useGame((s) => s.luckyMoneyProcIds);
  const handPlaySignal = useGame((s) => s.handPlaySignal);
  const toggleCard = useGame((s) => s.toggleCard);
  const forcedCardId = useGame((s) => s.forcedCardId);
  const setHandDisplayOrder = useGame((s) => s.setHandDisplayOrder);
  const blind = useGame((s) => s.blind);
  const currentBoss = useGame((s) => s.currentBoss);
  const playedCardKeysThisAnte = useGame((s) => s.playedCardKeysThisAnte);
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

  const debuffedIds = debuffedHandIds(
    hand,
    currentBoss,
    blind === 3,
    playedCardKeysThisAnte,
  );
  const forcesCard = blind === 3 && bossForcesCardSelection(currentBoss);
  const handleToggleCard = (card: Card) => {
    if (forcesCard && forcedCardId === card.id) {
      announce(t("a11y.cardLockedAttempt"));
      return;
    }
    toggleCard(card);
  };

  const inHandRemaining = useMemo(
    () => remaining.filter((c) => !destroyedCardIds.has(c.id)),
    [remaining, destroyedCardIds],
  );

  return (
    <HandComponent
      hand={hand}
      remaining={inHandRemaining}
      selectedIds={selectedIds}
      forcedCardId={forcesCard ? forcedCardId : null}
      discardingIds={discardingIds}
      newlyDrawnIds={newlyDrawnIds}
      debuffedIds={debuffedIds}
      scoringId={scoringId}
      scoringPulseTick={scoringPulseTick}
      goldScoringId={goldScoringId}
      steelScoringId={steelScoringId}
      luckyMultProcIds={luckyMultProcIds}
      luckyMoneyProcIds={luckyMoneyProcIds}
      handPlaySignal={handPlaySignal}
      onToggleCard={handleToggleCard}
      onCardDiscardEnd={onCardDiscardEnd}
      onDisplayOrderChange={setHandDisplayOrder}
      consumableDropEnabled={dragController.draggingConsumableIndex !== null}
      onConsumableSellDrop={dragController.onConsumableDropOnDeck}
      jokerDropEnabled={dragController.draggingJokerIndex !== null}
      onJokerSellDrop={dragController.onJokerDropOnDeck}
    />
  );
}
