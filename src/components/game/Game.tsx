import { Suspense, lazy } from "react";
import "./Game.css";
import type { Card } from "../../cards/types";
import HandComponent from "../cards/Hand";
import DeckPile from "../cards/DeckPile";
import Jokers from "../jokers/Jokers";
import Consumables from "../consumables/Consumables";
import type { ShopProps } from "../shop/Shop";
import type { PackOpenModalProps } from "../shop/PackOpenModal";
import ModifierPanel from "./ModifierPanel";
const Shop = lazy(() => import("../shop/Shop"));
const PackOpenModal = lazy(() => import("../shop/PackOpenModal"));
const NopeAnimation = lazy(() => import("./NopeAnimation"));
import { useGame } from "../../store/game";
import { useDragController } from "../../hooks/useDragController";
import { useConsumableActions } from "../../hooks/useConsumableActions";
import { play } from "../system/sounds";
import { canSubmitHand, debuffedHandIds } from "../../items/bosses";
import { MAX_CONSUMABLE_SLOTS } from "../../items/consumables";
import { extraConsumableSlots } from "../../items/vouchers";

interface GameProps {
  onSubmitHand: () => void;
  onDiscard: () => void;
  canDiscard: boolean;
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
  isScoring = false,
  scoringId = null,
  goldScoringId = null,
  steelScoringId = null,
  shop,
  packOpen,
  onCardDiscardEnd,
}: GameProps) {
  const hand = useGame((s) => s.dealt.hand);
  const remaining = useGame((s) => s.dealt.remaining);
  const selectedIds = useGame((s) => s.selectedIds);
  const discardingIds = useGame((s) => s.discardingIds);
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

  const dragging = dragController.draggingConsumableIndex !== null;
  const draggingJoker = dragController.draggingJokerIndex !== null;
  const previewActive = (packOpen?.previewHand?.length ?? 0) > 0;
  const consumableSelectedCount = previewActive
    ? packOpen?.previewSelectedIds?.size ?? 0
    : selectedIds.size;

  return (
    <main className="game" aria-label="Game">
      <div className="game-top-row">
        <Jokers
          jokers={jokers}
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
        {(shop || packOpen) && (
          <div className="game-overlay-deck">
            <DeckPile
              remaining={remaining}
              consumableDropEnabled={dragging}
              onConsumableDrop={dragController.onConsumableDropOnDeck}
              jokerDropEnabled={draggingJoker}
              onJokerDrop={dragController.onJokerDropOnDeck}
            />
          </div>
        )}
      </div>
      {packOpen && (
        <Suspense fallback={null}>
          <PackOpenModal {...packOpen} />
        </Suspense>
      )}
      {shop && (
        <Suspense fallback={null}>
          <Shop {...shop} disabled={!!packOpen} />
        </Suspense>
      )}
      {!shop && !packOpen && (
        <HandComponent
          hand={hand}
          remaining={remaining}
          selectedIds={selectedIds}
          discardingIds={discardingIds}
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
              className="submit-hand-button"
              onClick={onSubmitHand}
              disabled={isScoring || !canSubmit}
              aria-label={
                selectedHand
                  ? `Submit Hand: ${selectedHand.label}, ${chips + devChipsBonus} chips times ${(multiplier + devMultBonus) * devMultFactor} multiplier`
                  : "Submit Hand"
              }
            >
              <span aria-hidden="true">🃏 </span>Submit Hand
              {selectedHand && (
                <span
                  className="submit-hand-button-detected"
                  data-testid="submit-hand-detected"
                >
                  <span className="submit-hand-button-detected-label">
                    {selectedHand.label}
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
              className="discard-button"
              onClick={onDiscard}
              disabled={!canDiscard}
            >
              <span aria-hidden="true">🗑️ </span>Discard
            </button>
          </div>
        </div>
      )}
      <ModifierPanel />
      <Suspense fallback={null}>
        <NopeAnimation triggerKey={nopeTriggerKey} />
      </Suspense>
    </main>
  );
}
