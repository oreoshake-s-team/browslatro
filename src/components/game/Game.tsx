import type { Dispatch, SetStateAction } from "react";
import "./Game.css";
import type { Card, Hand } from "../../types";
import type { Joker } from "../../jokers";
import HandComponent from "../cards/Hand";
import Jokers from "../jokers/Jokers";

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
  onSetMoney: Dispatch<SetStateAction<number>>;
  selectedHand: Hand;
  hand: ReadonlyArray<Card>;
  remaining: ReadonlyArray<Card>;
  selectedIds: ReadonlySet<number>;
  discardingIds: ReadonlySet<number>;
  jokers: ReadonlyArray<Joker>;
  onToggleCard: (card: Card) => void;
  onCardDiscardEnd: (card: Card) => void;
  onDisplayOrderChange?: (orderedIds: ReadonlyArray<number>) => void;
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
  onSetMoney,
  selectedHand,
  hand,
  remaining,
  selectedIds,
  discardingIds,
  jokers,
  onToggleCard,
  onCardDiscardEnd,
  onDisplayOrderChange,
}: GameProps) {
  function handleAddMoney(amount: number) {
    onSetMoney((prev) => prev + amount);
  }

  function handleSubtractMoney(amount: number) {
    onSetMoney((prev) => prev - amount);
  }

  return (
    <div className="game">
      <Jokers jokers={jokers} />
      <HandComponent
        hand={hand}
        remaining={remaining}
        selectedIds={selectedIds}
        discardingIds={discardingIds}
        scoringId={scoringId}
        onToggleCard={onToggleCard}
        onCardDiscardEnd={onCardDiscardEnd}
        onDisplayOrderChange={onDisplayOrderChange}
      />
      <div className="hand-selection">
        <span className="step-label">1. Current hand</span>
        <div className="hand-display" aria-live="polite">
          {selectedHand.label}
        </div>
      </div>
      <div className="modifier-selection">
        <span className="step-label">2. Apply modifiers</span>
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
      </div>
      <div className="submit-hand">
        <span className="step-label">3. Play or discard</span>
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
