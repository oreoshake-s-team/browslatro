import type { Dispatch, SetStateAction } from "react";
import "./Game.css";
import type { Card } from "../../types";
import type { Joker } from "../../jokers";
import type { Consumable } from "../../consumables";
import HandComponent from "../cards/Hand";
import Jokers from "../jokers/Jokers";
import Consumables from "../consumables/Consumables";

interface GameProps {
  onWin: () => void;
  onAddChips: (amount: number) => void;
  onAddMultiplier: (amount: number) => void;
  onMultiplyMultiplier: (factor: number) => void;
  onSubmitHand: () => void;
  onDiscard: () => void;
  canDiscard: boolean;
  isScoring?: boolean;
  scoringId?: number | null;
  goldScoringId?: number | null;
  handPlaySignal?: number;
  onSetMoney: Dispatch<SetStateAction<number>>;
  hand: ReadonlyArray<Card>;
  remaining: ReadonlyArray<Card>;
  selectedIds: ReadonlySet<number>;
  discardingIds: ReadonlySet<number>;
  jokers: ReadonlyArray<Joker>;
  jokerPulseCounters?: Readonly<Record<string, number>>;
  consumables: ReadonlyArray<Consumable>;
  onUseConsumable: (index: number) => void;
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
  canDiscard,
  isScoring = false,
  scoringId = null,
  goldScoringId = null,
  handPlaySignal,
  onSetMoney,
  hand,
  remaining,
  selectedIds,
  discardingIds,
  jokers,
  jokerPulseCounters,
  consumables,
  onUseConsumable,
  onToggleCard,
  onCardDiscardEnd,
  onDisplayOrderChange,
  onReorderJokers,
}: GameProps) {
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
        />
        <Consumables
          consumables={consumables}
          selectedCount={selectedIds.size}
          onUse={onUseConsumable}
        />
      </div>
      <HandComponent
        hand={hand}
        remaining={remaining}
        selectedIds={selectedIds}
        discardingIds={discardingIds}
        scoringId={scoringId}
        goldScoringId={goldScoringId}
        handPlaySignal={handPlaySignal}
        onToggleCard={onToggleCard}
        onCardDiscardEnd={onCardDiscardEnd}
        onDisplayOrderChange={onDisplayOrderChange}
      />
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
        </div>
      </details>
      <div className="submit-hand">
        <div className="play-actions">
          <button
            className="submit-hand-button"
            onClick={onSubmitHand}
            disabled={isScoring}
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
    </div>
  );
}
