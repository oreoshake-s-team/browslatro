import "./Game.css";
import type { Card } from "../../cards/types";
import type { Joker } from "../../items/jokers";
import type { Consumable } from "../../items/consumables";
import HandComponent from "../cards/Hand";
import DeckPile from "../cards/DeckPile";
import Jokers from "../jokers/Jokers";
import Consumables from "../consumables/Consumables";
import Shop, { type ShopProps } from "../shop/Shop";
import PackOpenModal, {
  type PackOpenModalProps,
} from "../shop/PackOpenModal";
import ModifierPanel from "./ModifierPanel";

interface GameProps {
  onSubmitHand: () => void;
  onDiscard: () => void;
  canSubmit?: boolean;
  canDiscard: boolean;
  isScoring?: boolean;
  scoringId?: number | null;
  scoringPulseTick?: number;
  goldScoringId?: number | null;
  steelScoringId?: number | null;
  luckyMultProcIds?: ReadonlySet<number>;
  luckyMoneyProcIds?: ReadonlySet<number>;
  handPlaySignal?: number;
  hand: ReadonlyArray<Card>;
  remaining: ReadonlyArray<Card>;
  selectedIds: ReadonlySet<number>;
  discardingIds: ReadonlySet<number>;
  debuffedIds?: ReadonlySet<number>;
  jokers: ReadonlyArray<Joker>;
  jokerPulseCounters?: Readonly<Record<string, number>>;
  consumables: ReadonlyArray<Consumable>;
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
  scoringPulseTick = 0,
  goldScoringId = null,
  steelScoringId = null,
  luckyMultProcIds,
  luckyMoneyProcIds,
  handPlaySignal,
  hand,
  remaining,
  selectedIds,
  discardingIds,
  debuffedIds,
  jokers,
  jokerPulseCounters,
  consumables,
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
