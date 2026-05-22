import { useState } from "react";
import { createPortal } from "react-dom";

function App() {
  const blindValues = {
    1: "Small Blind",
    2: "Big Blind",
    3: "Boss Blind",
  };

  const [blind, setBlind] = useState(1);
  const [round, setRound] = useState(1);
  const [ante, setAnte] = useState(1);
  const [money, setMoney] = useState(0);

  function handleWin() {
    setRound((prev) => prev + 1);
    setMoney((prev) => prev + (blind + 2));
    if (blind < 3) {
      setBlind((prev) => prev + 1);
    } else {
      setAnte((prev) => prev + 1);
      setBlind(1);
    }
  }

  function handleReset() {
    setBlind(1);
    setRound(1);
    setAnte(1);
  }

  return (
    <div className="App">
      <div className="sidebar">
        <Round
          blind={blind}
          round={round}
          ante={ante}
          blindValues={blindValues}
        />
        <HandScore />
        <div className="sub-info-progress">
          <div className="sub-info">
            <RunInfo />
            <Options onReset={handleReset} />
          </div>
          <div className="progress">
            <RoundProgress />
            <RunProgress ante={ante} round={round} money={money} />
          </div>
        </div>
      </div>
      <Game onWin={handleWin} />
    </div>
  );
}

function Round({ blind, round, ante, blindValues }) {
  const baseChips = [300, 800, 2000, 5000, 11000, 20000, 35000, 50000];
  const blindMultiplier = [1, 1.5, 2][blind - 1];
  const requiredScore = baseChips[ante - 1] * blindMultiplier;
  const award = "💲".repeat(2 + blind);

  return (
    <div className="round-info">
      <h3>{blindValues[blind]}</h3>
      <h4>Score at least: {requiredScore}</h4>
      <p>to earn {award}</p>
    </div>
  );
}

function HandScore() {
  return (
    <div className="hand-score">
      <h3>Two pair</h3>
      <p>
        <span className="chips">40</span>
        <span>X</span>
        <span className="multiplier">2</span>
      </p>
    </div>
  );
}

function RunInfo() {
  return <button>Run info</button>;
}

function Options({ onReset }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Options</button>
      {open &&
        createPortal(
          <div className="modal-overlay" onClick={() => setOpen(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h3>Options</h3>
              <button
                className="win-button reset-button"
                onClick={() => {
                  onReset();
                  setOpen(false);
                }}
              >
                Reset
              </button>
              <button className="modal-close" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

function RoundProgress() {
  return <div>Round Progress</div>;
}

function RunProgress({ ante, round, money }) {
  return (
    <div className="run-progress">
      <div className="stat">
        <span className="stat-value">${money}</span>
        <span className="stat-label">Money</span>
      </div>
      <div className="run-progress-row">
        <div className="stat">
          <span className="stat-value">{ante}</span>
          <span className="stat-label">Ante</span>
        </div>
        <div className="stat">
          <span className="stat-value">{round}</span>
          <span className="stat-label">Round</span>
        </div>
      </div>
    </div>
  );
}

function Game({ onWin }) {
  return (
    <div className="game">
      <button className="win-button" onClick={onWin}>
        Win
      </button>
    </div>
  );
}

export default App;
