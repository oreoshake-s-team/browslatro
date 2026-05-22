function Game({ onWin }) {
  return (
    <div className="game">
      <button className="win-button" onClick={onWin}>
        Win
      </button>
    </div>
  );
}

export default Game;