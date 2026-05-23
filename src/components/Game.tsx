import type { Dispatch, SetStateAction } from "react";

interface GameProps {
  onWin: () => void;
  onAddChips: (amount: number) => void;
  onAddMultiplier: (amount: number) => void;
  onMultiplyMultiplier: (factor: number) => void;
  onSubmitHand: () => void;
  onSetMoney: Dispatch<SetStateAction<number>>;
}

export default function Game({
  onWin,
  onAddChips,
  onAddMultiplier,
  onMultiplyMultiplier,
  onSubmitHand,
  onSetMoney,
}: GameProps) {
  function handleAddMoney(amount: number) {
    onSetMoney((prev) => prev + amount);
  }

  function handleSubtractMoney(amount: number) {
    onSetMoney((prev) => prev - amount);
  }

  return (
    <div className="game">
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
      <button className="submit-hand-button" onClick={onSubmitHand}>
        🃏 Submit Hand
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
  );
}
