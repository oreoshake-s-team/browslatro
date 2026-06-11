import { Suspense, lazy, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { tHandLabel } from "../../i18n/handLabels";
import "./Game.css";
import type { Card } from "../../cards/types";
import HandComponent from "../cards/Hand";
import DeckPile from "../cards/DeckPile";
import Jokers from "../jokers/Jokers";
import Consumables from "../consumables/Consumables";
import type { ShopProps } from "../shop/Shop";
import type { PackOpenModalProps } from "../shop/PackOpenModal";
import ModifierPanel from "./ModifierPanel";
import LazyChunkSpinner from "../system/LazyChunkSpinner";
import LazyChunkErrorBoundary from "../system/LazyChunkErrorBoundary";
const Shop = lazy(() => import("../shop/Shop"));
const PackOpenModal = lazy(() => import("../shop/PackOpenModal"));
const NopeAnimation = lazy(() => import("./NopeAnimation"));
const AdvisorPanel = lazy(() => import("./AdvisorPanel"));
import { useGame } from "../../store/game";
import { useDragController } from "../../hooks/useDragController";
import { useConsumableActions } from "../../hooks/useConsumableActions";
import { play } from "../system/sounds";
import { canSubmitHand, debuffedHandIds } from "../../items/bosses";
import { MAX_CONSUMABLE_SLOTS } from "../../items/consumables";
import { MAX_JOKERS } from "../../items/jokers";
import { deckJokerSlotsDelta } from "../../items/decks";
import { extraConsumableSlots, extraJokerSlots } from "../../items/vouchers";
import { fullDeckPile } from "../../cards/deckBuild";

interface GameProps {
  onSubmitHand: () => void;
  onDiscard: () => void;
  canDiscard: boolean;
  autopilotEnabled?: boolean;
  onToggleAutopilot?: () => void;
  isScoring?: boolean;
  scoringId?: number | null;
  goldScoringId?: number | null;
  steelScoringId?: number | null;
  shop?: ShopProps;
  packOpen?: PackOpenModalProps;
  onCardDiscardEnd: (card: Card) => void;
}

export default function Game({
  onSubmitHand,
  onDiscard,
  canDiscard,
  autopilotEnabled = false,
  onToggleAutopilot,
  isScoring = false,
  scoringId = null,
  goldScoringId = null,
  steelScoringId = null,
  shop,
  packOpen,
  onCardDiscardEnd,
}: GameProps) {
  const { t } = useTranslation();
  const [advisorOpen, setAdvisorOpen] = useState(false);
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
  const scoringPulseTick = useGame((s) => s.scoringIndex);
  const luckyMultProcIds = useGame((s) => s.luckyMultProcIds);
  const luckyMoneyProcIds = useGame((s) => s.luckyMoneyProcIds);
  const handPlaySignal = useGame((s) => s.handPlaySignal);
  const toggleCard = useGame((s) => s.toggleCard);
  const setHandDisplayOrder = useGame((s) => s.setHandDisplayOrder);
  const reorderJokers = useGame((s) => s.reorderJokers);
  const blind = useGame((s) => s.blind);
  const currentBoss = useGame((s) => s.currentBoss);
  const selectedHand = useGame((s) => s.selectedHand);
  const chips = useGame((s) => s.chips);
  const multiplier = useGame((s) => s.multiplier);
  const devChipsBonus = useGame((s) => s.devChipsBonus);
  const devMultBonus = useGame((s) => s.devMultBonus);
  const devMultFactor = useGame((s) => s.devMultFactor);
  const handHistoryThisRound = useGame((s) => s.handHistoryThisRound);
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

  const canSubmit = canSubmitHand(
    blind,
    currentBoss,
    selectedHand,
    handHistoryThisRound,
  );
  const debuffedIds = debuffedHandIds(
    hand,
    currentBoss,
    blind === 3,
    playedCardKeysThisAnte,
  );
  const consumableCapacity =
    MAX_CONSUMABLE_SLOTS + extraConsumableSlots(ownedVoucherIds);
  const jokerCapacity = Math.max(
    0,
    MAX_JOKERS +
      extraJokerSlots(ownedVoucherIds) +
      deckJokerSlotsDelta(selectedDeck),
  );
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
  const handVisible = (!shop && !packOpen) || (!!packOpen && !previewActive);
  const consumableSelectedCount = previewActive
    ? packOpen?.previewSelectedIds?.size ?? 0
    : selectedIds.size;

  return (
    <main className="game" aria-label={t("a11y.game")}>
      <div className="game-top-row">
        <Jokers
          jokers={jokers}
          capacity={jokerCapacity}
          pulseCounters={jokerPulseCounters}
          onReorder={reorderJokers}
          onSell={sellJoker}
          onDragStart={dragController.onJokerDragStart}
          onDragEnd={dragController.onJokerDragEnd}
          consumableDropEnabled={
            dragging && dragController.canDropDraggedConsumableOnJokers
          }
          onConsumableDrop={dragController.onConsumableDropOnJokers}
        />
        <Consumables
          consumables={consumables}
          selectedCount={consumableSelectedCount}
          previewMode={previewActive}
          capacity={consumableCapacity}
          onUse={useConsumable}
          onSell={sellConsumable}
          onDragStart={dragController.onConsumableDragStart}
          onDragEnd={dragController.onConsumableDragEnd}
        />
        {(shop || packOpen) && !handVisible && (
          <div className="game-overlay-deck">
            <DeckPile
              remaining={overlayDeckRemaining}
              consumableDropEnabled={dragging}
              onConsumableDrop={dragController.onConsumableDropOnDeck}
              jokerDropEnabled={draggingJoker}
              onJokerDrop={dragController.onJokerDropOnDeck}
            />
          </div>
        )}
      </div>
      {packOpen && (
        <Suspense fallback={<LazyChunkSpinner variant="overlay" />}>
          <PackOpenModal {...packOpen} />
        </Suspense>
      )}
      {shop && (
        <Suspense fallback={<LazyChunkSpinner />}>
          <Shop {...shop} disabled={!!packOpen} />
        </Suspense>
      )}
      {handVisible && (
        <HandComponent
          hand={hand}
          remaining={inHandRemaining}
          selectedIds={selectedIds}
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
          onToggleCard={toggleCard}
          onCardDiscardEnd={onCardDiscardEnd}
          onDisplayOrderChange={setHandDisplayOrder}
          consumableDropEnabled={dragging}
          onConsumableSellDrop={dragController.onConsumableDropOnDeck}
          jokerDropEnabled={draggingJoker}
          onJokerSellDrop={dragController.onJokerDropOnDeck}
        />
      )}
      {!shop && !packOpen && (
        <div className="submit-hand">
          <div className="play-actions">
            <button
              className="btn btn--primary submit-hand-button"
              onClick={onSubmitHand}
              disabled={isScoring || !canSubmit}
              aria-label={
                selectedHand
                  ? t("a11y.submitHandWith", {
                      hand: tHandLabel(t, selectedHand.label),
                      chips: chips + devChipsBonus,
                      mult: (multiplier + devMultBonus) * devMultFactor,
                    })
                  : t("a11y.submitHand")
              }
            >
              <span aria-hidden="true">🃏 </span>
              {t("game.submitHand")}
              {selectedHand && (
                <span
                  className="submit-hand-button-detected"
                  data-testid="submit-hand-detected"
                >
                  <span className="submit-hand-button-detected-label">
                    {tHandLabel(t, selectedHand.label)}
                  </span>
                  <span className="submit-hand-button-detected-score">
                    <span className="submit-hand-button-chips">
                      {chips + devChipsBonus}
                    </span>
                    <span aria-hidden="true"> × </span>
                    <span className="submit-hand-button-mult">
                      {(multiplier + devMultBonus) * devMultFactor}
                    </span>
                  </span>
                </span>
              )}
            </button>
            <button
              className="btn btn--danger discard-button"
              onClick={onDiscard}
              disabled={!canDiscard}
            >
              <span aria-hidden="true">🗑️ </span>Discard
            </button>
            <button
              className="btn advisor-open-button"
              onClick={() => setAdvisorOpen(true)}
              disabled={isScoring}
            >
              <span aria-hidden="true">🎓 </span>
              {t("advisor.open")}
            </button>
            {onToggleAutopilot && (
              <button
                className="btn autopilot-toggle-button"
                onClick={onToggleAutopilot}
                aria-pressed={autopilotEnabled}
              >
                <span aria-hidden="true">🤖 </span>
                {t("advisor.autopilot")}
              </button>
            )}
          </div>
        </div>
      )}
      {advisorOpen && (
        <LazyChunkErrorBoundary>
          <Suspense fallback={<LazyChunkSpinner variant="overlay" />}>
            <AdvisorPanel onClose={() => setAdvisorOpen(false)} />
          </Suspense>
        </LazyChunkErrorBoundary>
      )}
      <ModifierPanel />
      <Suspense fallback={<LazyChunkSpinner />}>
        <NopeAnimation triggerKey={nopeTriggerKey} />
      </Suspense>
    </main>
  );
}
