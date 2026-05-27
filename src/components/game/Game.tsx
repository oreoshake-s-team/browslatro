import type { Dispatch, SetStateAction } from "react";
import "./Game.css";
import type { Card } from "../../cards/types";
import type { Joker } from "../../items/jokers";
import type { Consumable } from "../../items/consumables";
import HandComponent from "../cards/Hand";
import Jokers from "../jokers/Jokers";
import Consumables from "../consumables/Consumables";
import Shop, { type ShopProps } from "../shop/Shop";

interface GameProps {
  onWin: () => void;
  onAddChips: (amount: number) => void;
  onAddMultiplier: (amount: number) => void;
  onMultiplyMultiplier: (factor: number) => void;
  onSubmitHand: () => void;
  onDiscard: () => void;
  canSubmit?: boolean;
  canDiscard: boolean;
  isScoring?: boolean;
  scoringId?: number | null;
  scoringPulseTick?: number;
  goldScoringId?: number | null;
  steelScoringId?: number | null;
  handPlaySignal?: number;
  onSetMoney: Dispatch<SetStateAction<number>>;
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
  onShrinkHandSize?: () => void;
  onGrowHandSize?: () => void;
  onShrinkPackSlots?: () => void;
  onGrowPackSlots?: () => void;
  onShrinkVoucherSlots?: () => void;
  onGrowVoucherSlots?: () => void;
  forceProbabilities?: boolean;
  onToggleForceProbabilities?: () => void;
  shop?: ShopProps;
  onToggleCard: (card: Card) => void;
  onCardDiscardEnd: (card: Card) => void;
  onDisplayOrderChange?: (orderedIds: ReadonlyArray<number>) => void;
  onReorderJokers?: (orderedIds: ReadonlyArray<string>) => void;
}

export default function Game({
  onWin,
  onAddChips,
  onAddMultiplier,
  onMultiplyMultiplier,
  onSubmitHand,
  onDiscard,
  canSubmit = true,
  canDiscard,
  isScoring = false,
  scoringId = null,
  scoringPulseTick = 0,
  goldScoringId = null,
  steelScoringId = null,
  handPlaySignal,
  onSetMoney,
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
  onShrinkHandSize,
  onGrowHandSize,
  onShrinkPackSlots,
  onGrowPackSlots,
  onShrinkVoucherSlots,
  onGrowVoucherSlots,
  forceProbabilities = false,
  onToggleForceProbabilities,
  shop,
  onToggleCard,
  onCardDiscardEnd,
  onDisplayOrderChange,
  onReorderJokers,
}: GameProps) {
  const dragging = draggingConsumableIndex !== null;
  const draggingJoker = draggingJokerIndex !== null;
  function handleAddMoney(amount: number) {
    onSetMoney((prev) => prev + amount);
  }

  function handleSubtractMoney(amount: number) {
    onSetMoney((prev) => prev - amount);
  }

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
          selectedCount={selectedIds.size}
          capacity={consumableCapacity}
          onUse={onUseConsumable}
          onSell={onSellConsumable}
          onDragStart={onConsumableDragStart}
          onDragEnd={onConsumableDragEnd}
        />
      </div>
      {shop ? (
        <Shop {...shop} />
      ) : (
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
      <details className="modifier-selection">
        <summary className="modifier-disclosure">Apply modifiers</summary>
        <div className="modifier-grid">
          <button className="add-chips-button" onClick={() => onAddChips(10)}>
            🪙 Add Chips
          </button>
          <button
            className="add-multiplier-button"
            onClick={() => onAddMultiplier(1)}
          >
            ➕ Add Multiplier
          </button>
          <button
            className="multiply-multiplier-button"
            onClick={() => onMultiplyMultiplier(2)}
          >
            ✖️ Multiply Multiplier
          </button>
          <button className="win-button" onClick={onWin}>
            🏆 Win
          </button>
          <button className="add-money-button" onClick={() => handleAddMoney(10)}>
            💵 Add $10
          </button>
          <button
            className="subtract-money-button"
            onClick={() => handleSubtractMoney(10)}
          >
            💸 Subtract $10
          </button>
          {onShrinkHandSize && (
            <button
              type="button"
              className="shrink-hand-button"
              onClick={onShrinkHandSize}
            >
              🤏 Hand −1
            </button>
          )}
          {onGrowHandSize && (
            <button
              type="button"
              className="grow-hand-button"
              onClick={onGrowHandSize}
            >
              ✋ Hand +1
            </button>
          )}
          {onShrinkPackSlots && (
            <button
              type="button"
              className="shrink-pack-slots-button"
              onClick={onShrinkPackSlots}
            >
              📦 Packs −1
            </button>
          )}
          {onGrowPackSlots && (
            <button
              type="button"
              className="grow-pack-slots-button"
              onClick={onGrowPackSlots}
            >
              🎁 Packs +1
            </button>
          )}
          {onShrinkVoucherSlots && (
            <button
              type="button"
              className="shrink-voucher-slots-button"
              onClick={onShrinkVoucherSlots}
            >
              🎟️ Vouchers −1
            </button>
          )}
          {onGrowVoucherSlots && (
            <button
              type="button"
              className="grow-voucher-slots-button"
              onClick={onGrowVoucherSlots}
            >
              🎫 Vouchers +1
            </button>
          )}
          {onToggleForceProbabilities && (
            <button
              type="button"
              className="force-probabilities-button"
              onClick={onToggleForceProbabilities}
              aria-pressed={forceProbabilities}
            >
              🎲 Force Probabilities {forceProbabilities ? "Off" : "On"}
            </button>
          )}
        </div>
      </details>
      {!shop && (
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
