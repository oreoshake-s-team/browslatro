interface GameProps {
  onWin: () => void;
}

function Game({ onWin }: GameProps) {
  return (
    <div className="game">
      <button className="win-button" onClick={onWin}>
        Win
      </button>
    </div>
  );
}

export default Game;