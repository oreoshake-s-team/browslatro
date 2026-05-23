import type { Dispatch, SetStateAction } from "react";

export interface Hand {
  readonly label: string;
  readonly chips: number;
  readonly multiplier: number;
}

export const HANDS: ReadonlyArray<Hand> = [
  { label: "High Card", chips: 5, multiplier: 1 },
  { label: "Pair", chips: 10, multiplier: 2 },
  { label: "Two Pair", chips: 20, multiplier: 2 },
  { label: "Three of a Kind", chips: 30, multiplier: 3 },
  { label: "Straight", chips: 30, multiplier: 4 },
  { label: "Flush", chips: 35, multiplier: 4 },
  { label: "Full House", chips: 40, multiplier: 4 },
  { label: "Four of a Kind", chips: 60, multiplier: 7 },
  { label: "Straight Flush", chips: 100, multiplier: 8 },
  { label: "Royal Flush", chips: 100, multiplier: 8 },
  { label: "Five of a Kind", chips: 120, multiplier: 12 },
  { label: "Flush House", chips: 140, multiplier: 14 },
  { label: "Flush Five", chips: 160, multiplier: 16 },
] as const;

interface GameProps {
  onWin: () => void;
  onAddChips: (amount: number) => void;
  onAddMultiplier: (amount: number) => void;
  onMultiplyMultiplier: (factor: number) => void;
  onSubmitHand: () => void;
  onSetMoney: Dispatch<SetStateAction<number>>;
  selectedHand: Hand;
  onSelectHand: (hand: Hand) => void;
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
}: GameProps) {
  function handleAddMoney(amount: number) {
    onSetMoney((prev) => prev + amount);
  }

  function handleSubtractMoney(amount: number) {
    onSetMoney((prev) => prev - amount);
  }

  function handleHandChange(hand: Hand) {
    onSelectHand(hand);
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
      </div>
      <div className="submit-hand">
        <button className="submit-hand-button" onClick={onSubmitHand}>
          🃏 Submit Hand
        </button>
      </div>
    </div>
  );
}
