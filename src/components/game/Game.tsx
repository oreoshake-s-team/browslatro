import { Suspense, lazy, useMemo } from "react";
import { useTranslation } from "react-i18next";
import "./Game.css";
import type { Card } from "../../cards/types";
import HandComponent from "../cards/Hand";
import DeckPile from "../cards/DeckPile";
import Jokers from "../jokers/Jokers";
import Consumables from "../consumables/Consumables";
import { foolCopyTargetText } from "../../i18n/foolCopyTarget";
import { packShowsHandArea } from "../../items/packs";
import { useShopController } from "../../hooks/useShopController";
import { usePackOpenController } from "../../hooks/usePackOpenController";
import ModifierPanel from "./ModifierPanel";
import PlayControls from "./PlayControls";
import { useGameSession } from "./gameSession";
import LazyChunkSpinner from "../system/LazyChunkSpinner";
const Shop = lazy(() => import("../shop/Shop"));
const PackOpenModal = lazy(() => import("../shop/PackOpenModal"));
const NopeAnimation = lazy(() => import("./NopeAnimation"));
import { useGame } from "../../store/game";
import { consumableCapacityFor, jokerCapacityFor } from "../../items/capacities";
import { useDragController } from "../../hooks/useDragController";
import { useConsumableActions } from "../../hooks/useConsumableActions";
import { useCeruleanForcedCard } from "../../hooks/useCeruleanForcedCard";
import { play } from "../system/sounds";
import { announce } from "../system/LiveAnnouncer";
import { usePreferences } from "../system/preferences";
import {
  bossForcesCardSelection,
  bossHidesJokers,
  debuffedHandIds,
} from "../../items/bosses";
import { fullDeckPile } from "../../cards/deckBuild";

export default function Game() {
  const {
    isScoring,
    currentScoringId: scoringId,
    currentGoldScoringId: goldScoringId,
    currentSteelScoringId: steelScoringId,
    handleCardDiscardEnd: onCardDiscardEnd,
  } = useGameSession();
  const shop = useShopController();
  const packOpen = usePackOpenController();
  const { t, i18n } = useTranslation();
  const hand = useGame((s) => s.dealt.hand);
  const remaining = useGame((s) => s.dealt.remaining);
  const baseDeckCards = useGame((s) => s.baseDeckCards);
  const destroyedCardIds = useGame((s) => s.destroyedCardIds);
  const addedCards = useGame((s) => s.addedCards);
  const cardEnhancementsById = useGame((s) => s.cardEnhancementsById);
  const cardSealsById = useGame((s) => s.cardSealsById);
  const selectedIds = useGame((s) => s.selectedIds);
  const discardingIds = useGame((s) => s.discardingIds);
  const newlyDrawnIds = useGame((s) => s.newlyDrawnIds);
  const jokers = useGame((s) => s.jokers);
  const jokerPulseCounters = useGame((s) => s.jokerPulseCounters);
  const consumables = useGame((s) => s.consumables);
  const lastUsedConsumable = useGame((s) => s.lastUsedConsumable);
  const scoringPulseTick = useGame((s) => s.scoringIndex);
  const luckyMultProcIds = useGame((s) => s.luckyMultProcIds);
  const luckyMoneyProcIds = useGame((s) => s.luckyMoneyProcIds);
  const handPlaySignal = useGame((s) => s.handPlaySignal);
  const toggleCard = useGame((s) => s.toggleCard);
  const forcedCardId = useGame((s) => s.forcedCardId);
  const setHandDisplayOrder = useGame((s) => s.setHandDisplayOrder);
  const reorderJokers = useGame((s) => s.reorderJokers);
  const blind = useGame((s) => s.blind);
  const currentBoss = useGame((s) => s.currentBoss);
  const adminMode = usePreferences((s) => s.adminMode);
  const playedCardKeysThisAnte = useGame((s) => s.playedCardKeysThisAnte);
  const ownedVoucherIds = useGame((s) => s.ownedVoucherIds);
  const selectedDeck = useGame((s) => s.selectedDeck);
  const nopeTriggerKey = useGame((s) => s.nopeTriggerKey);
  const sellConsumableAction = useGame((s) => s.sellConsumable);
  const sellJokerAction = useGame((s) => s.sellJoker);

  const { useConsumable } = useConsumableActions();

  function sellConsumable(consumableIdx: number): void {
    play("pop");
    sellConsumableAction(consumableIdx);
  }
  function sellJoker(jokerIdx: number): void {
    play("pop");
    sellJokerAction(jokerIdx);
  }

  const dragController = useDragController({
    useConsumable,
    sellConsumable,
    sellJoker,
  });

  const debuffedIds = debuffedHandIds(
    hand,
    currentBoss,
    blind === 3,
    playedCardKeysThisAnte,
  );
  useCeruleanForcedCard();
  const forcesCard = blind === 3 && bossForcesCardSelection(currentBoss);
  const handleToggleCard = (card: Card) => {
    if (forcesCard && forcedCardId === card.id) {
      announce(t("a11y.cardLockedAttempt"));
      return;
    }
    toggleCard(card);
  };
  const consumableCapacity =
    consumableCapacityFor(ownedVoucherIds);
  const foolCopyTarget = foolCopyTargetText(t, i18n.language, lastUsedConsumable);
  const jokerCapacity = jokerCapacityFor(ownedVoucherIds, selectedDeck);
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
  const inHandRemaining = useMemo(
    () => remaining.filter((c) => !destroyedCardIds.has(c.id)),
    [remaining, destroyedCardIds],
  );

  const dragging = dragController.draggingConsumableIndex !== null;
  const draggingJoker = dragController.draggingJokerIndex !== null;
  const previewActive = (packOpen?.previewHand?.length ?? 0) > 0;
  const handVisible = !shop && !packOpen;
  const holdsHandConsumable = consumables.some(
    (c) => c.kind === "tarot" || c.kind === "spectral",
  );
  const packShowsHand = packOpen ? packShowsHandArea(packOpen.pack.pool) : false;
  const showPackHand =
    !!packOpen && packShowsHand && !previewActive && holdsHandConsumable;
  const consumableSelectedCount = previewActive
    ? packOpen?.previewSelectedIds?.size ?? 0
    : selectedIds.size;

  const packOffersJoker = packOpen
    ? packOpen.pack.options.some((option) => option.kind === "joker")
    : false;
  const jokersNode = (
    <Jokers
      jokers={jokers}
      capacity={jokerCapacity}
      faceDown={blind === 3 && bossHidesJokers(currentBoss)}
      pulseCounters={jokerPulseCounters}
      onReorder={reorderJokers}
      onSell={sellJoker}
      sellAlwaysVisible={packOffersJoker}
      onDragStart={dragController.onJokerDragStart}
      onDragEnd={dragController.onJokerDragEnd}
      consumableDropEnabled={
        dragging && dragController.canDropDraggedConsumableOnJokers
      }
      onConsumableDrop={dragController.onConsumableDropOnJokers}
    />
  );
  const consumablesNode = (
    <Consumables
      consumables={consumables}
      foolCopyTarget={foolCopyTarget}
      selectedCount={consumableSelectedCount}
      previewMode={previewActive}
      capacity={consumableCapacity}
      onUse={useConsumable}
      onSell={sellConsumable}
      onDragStart={dragController.onConsumableDragStart}
      onDragEnd={dragController.onConsumableDragEnd}
    />
  );
  const handNode = (
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
      consumableDropEnabled={dragging}
      onConsumableSellDrop={dragController.onConsumableDropOnDeck}
      jokerDropEnabled={draggingJoker}
      onJokerSellDrop={dragController.onJokerDropOnDeck}
    />
  );
  const overlayDeckNode = (
    <div className="game-overlay-deck">
      <DeckPile
        remaining={overlayDeckRemaining}
        consumableDropEnabled={dragging}
        onConsumableDrop={dragController.onConsumableDropOnDeck}
        jokerDropEnabled={draggingJoker}
        onJokerDrop={dragController.onJokerDropOnDeck}
      />
    </div>
  );

  return (
    <main className="game" aria-label={t("a11y.game")} aria-busy={isScoring}>
      <div className="game-top-row">
        {!packOpen && jokersNode}
        {!packOpen && consumablesNode}
        {shop && !packOpen && overlayDeckNode}
      </div>
      {packOpen && (
        <Suspense fallback={<LazyChunkSpinner variant="overlay" />}>
          <PackOpenModal
            {...packOpen}
            foolCopyTarget={foolCopyTarget}
            playArea={
              <>
                <div className="game-top-row">
                  {jokersNode}
                  {consumablesNode}
                  {packShowsHand && !showPackHand && overlayDeckNode}
                </div>
                {showPackHand && handNode}
              </>
            }
          />
        </Suspense>
      )}
      {shop && (
        <Suspense fallback={<LazyChunkSpinner />}>
          <Shop {...shop} disabled={!!packOpen} foolCopyTarget={foolCopyTarget} />
        </Suspense>
      )}
      {handVisible && handNode}
      {!shop && !packOpen && <PlayControls />}
      {adminMode && <ModifierPanel />}
      <Suspense fallback={<LazyChunkSpinner />}>
        <NopeAnimation triggerKey={nopeTriggerKey} />
      </Suspense>
    </main>
  );
}
