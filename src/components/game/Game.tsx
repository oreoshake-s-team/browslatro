import "./Game.css";
import type { Card } from "../../cards/types";
import HandComponent from "../cards/Hand";
import DeckPile from "../cards/DeckPile";
import Jokers from "../jokers/Jokers";
import Consumables from "../consumables/Consumables";
import Shop, { type ShopProps } from "../shop/Shop";
import PackOpenModal, {
  type PackOpenModalProps,
} from "../shop/PackOpenModal";
import ModifierPanel from "./ModifierPanel";
import { useGame } from "../../store/game";

interface GameProps {
  onSubmitHand: () => void;
  onDiscard: () => void;
  canSubmit?: boolean;
  canDiscard: boolean;
  isScoring?: boolean;
  scoringId?: number | null;
  goldScoringId?: number | null;
  steelScoringId?: number | null;
  debuffedIds?: ReadonlySet<number>;
  consumableCapacity?: number;
  onUseConsumable: (index: number) => void;
  onSellConsumable?: (index: number) => void;
  onConsumableDragStart?: (index: number) => void;
  onConsumableDragEnd?: () => void;
  draggingConsumableIndex?: number | null;
  canDropDraggedConsumableOnJokers?: boolean;
  onConsumableDropOnJokers?: () => void;
  onConsumableDropOnDeck?: () => void;
  draggingJokerIndex?: number | null;
  onJokerDragStart?: (index: number) => void;
  onJokerDragEnd?: () => void;
  onSellJoker?: (index: number) => void;
  onJokerDropOnDeck?: () => void;
  shop?: ShopProps;
  packOpen?: PackOpenModalProps;
  onToggleCard: (card: Card) => void;
  onCardDiscardEnd: (card: Card) => void;
  onDisplayOrderChange?: (orderedIds: ReadonlyArray<number>) => void;
  onReorderJokers?: (orderedIds: ReadonlyArray<string>) => void;
}

export default function Game({
  onSubmitHand,
  onDiscard,
  canSubmit = true,
  canDiscard,
  isScoring = false,
  scoringId = null,
  goldScoringId = null,
  steelScoringId = null,
  debuffedIds,
  consumableCapacity,
  onUseConsumable,
  onSellConsumable,
  onConsumableDragStart,
  onConsumableDragEnd,
  draggingConsumableIndex = null,
  canDropDraggedConsumableOnJokers = false,
  onConsumableDropOnJokers,
  onConsumableDropOnDeck,
  draggingJokerIndex = null,
  onJokerDragStart,
  onJokerDragEnd,
  onSellJoker,
  onJokerDropOnDeck,
  shop,
  packOpen,
  onToggleCard,
  onCardDiscardEnd,
  onDisplayOrderChange,
  onReorderJokers,
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

  const dragging = draggingConsumableIndex !== null;
  const draggingJoker = draggingJokerIndex !== null;
  const previewActive = (packOpen?.previewHand?.length ?? 0) > 0;
  const consumableSelectedCount = previewActive
    ? packOpen?.previewSelectedIds?.size ?? 0
    : selectedIds.size;

  return (
    <div className="game">
      <div className="game-top-row">
        <Jokers
          jokers={jokers}
          pulseCounters={jokerPulseCounters}
          onReorder={onReorderJokers}
          onSell={onSellJoker}
          onDragStart={onJokerDragStart}
          onDragEnd={onJokerDragEnd}
          consumableDropEnabled={dragging && canDropDraggedConsumableOnJokers}
          onConsumableDrop={onConsumableDropOnJokers}
        />
        <Consumables
          consumables={consumables}
          selectedCount={consumableSelectedCount}
          previewMode={previewActive}
          capacity={consumableCapacity}
          onUse={onUseConsumable}
          onSell={onSellConsumable}
          onDragStart={onConsumableDragStart}
          onDragEnd={onConsumableDragEnd}
        />
        {(shop || packOpen) && (
          <div className="game-overlay-deck">
            <DeckPile
              remaining={remaining}
              consumableDropEnabled={dragging}
              onConsumableDrop={onConsumableDropOnDeck}
              jokerDropEnabled={draggingJoker}
              onJokerDrop={onJokerDropOnDeck}
            />
          </div>
        )}
      </div>
      {packOpen && <PackOpenModal {...packOpen} />}
      {shop && <Shop {...shop} disabled={!!packOpen} />}
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
          onToggleCard={onToggleCard}
          onCardDiscardEnd={onCardDiscardEnd}
          onDisplayOrderChange={onDisplayOrderChange}
          consumableDropEnabled={dragging}
          onConsumableSellDrop={onConsumableDropOnDeck}
          jokerDropEnabled={draggingJoker}
          onJokerSellDrop={onJokerDropOnDeck}
        />
      )}
      <ModifierPanel />
      {!shop && !packOpen && (
        <div className="submit-hand">
          <div className="play-actions">
            <button
              className="submit-hand-button"
              onClick={onSubmitHand}
              disabled={isScoring || !canSubmit}
            >
              🃏 Submit Hand
            </button>
            <button
              className="discard-button"
              onClick={onDiscard}
              disabled={!canDiscard}
            >
              🗑️ Discard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
