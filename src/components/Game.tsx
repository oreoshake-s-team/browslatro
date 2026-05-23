import type { Dispatch, SetStateAction } from "react";
import type { Hand } from "../types";
import { HANDS } from "../constants";

interface GameProps {
  onWin: () => void;
  onAddChips: (amount: number) => void;
  onAddMultiplier: (amount: number) => void;
  onMultiplyMultiplier: (factor: number) => void;
  onSubmitHand: () => void;
  onSetMoney: Dispatch<SetStateAction<number>>;
  selectedHand: Hand;
  onSelectHand: (hand: Hand) => void;
  onSetChips: Dispatch<SetStateAction<number>>;
  onSetMultiplier: Dispatch<SetStateAction<number>>;
}

export default function Game({
  onWin,
  onAddChips,
  onAddMultiplier,
  onMultiplyMultiplier,
  onSubmitHand,
  onSetMoney,
  selectedHand,
  onSelectHand,
  onSetChips,
  onSetMultiplier,
}: GameProps) {
  function handleAddMoney(amount: number) {
    onSetMoney((prev) => prev + amount);
  }

  function handleSubtractMoney(amount: number) {
    onSetMoney((prev) => prev - amount);
  }

  function handleHandChange(hand: Hand) {
    onSetChips(hand.chips);
    onSetMultiplier(hand.multiplier);
    onSelectHand(hand);
  }

  function handleSubmitHand() {
    onSubmitHand();
    onSelectHand(HANDS[0]);
  }

  return (
    <div className="game">
      <div>
        <button className="win-button" onClick={onWin}>
          🏆 Win
        </button>
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
      <div className="submit-hand">
        <select
          value={HANDS.indexOf(selectedHand)}
          onChange={(e) => handleHandChange(HANDS[Number(e.target.value)])}
        >
          {HANDS.map((hand, i) => (
            <option key={hand.label} value={i}>
              {hand.label}
            </option>
          ))}
        </select>
        <button className="submit-hand-button" onClick={handleSubmitHand}>
          🃏 Submit Hand
        </button>
      </div>
    </div>
  );
}
