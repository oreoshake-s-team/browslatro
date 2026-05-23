interface GameProps {
  onWin: () => void;
  onAddChips: (amount: number) => void;
  onAddMultiplier: (amount: number) => void;
  onMultiplyMultiplier: (factor: number) => void;
}

function Game({
  onWin,
  onAddChips,
  onAddMultiplier,
  onMultiplyMultiplier,
}: GameProps) {
  return (
    <div className="game">
      <button className="win-button" onClick={onWin}>
        Win
      </button>
      <button className="add-chips-button" onClick={() => onAddChips(10)}>
        Add Chips
      </button>
      <button
        className="add-multiplier-button"
        onClick={() => onAddMultiplier(1)}
      >
        Add Multiplier
      </button>
      <button
        className="multiply-multiplier-button"
        onClick={() => onMultiplyMultiplier(2)}
      >
        Multiply Multiplier
      </button>
    </div>
  );
}

export default Game;
