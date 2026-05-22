import "./App.css";
import { useState } from "react";

function App() {
  const blindValues = {
    1: "Small Blind",
    2: "Big Blind",
    3: "Boss Blind",
  };

  const [blind, setBlind] = useState(1);
  const [round, setRound] = useState(1);
  const [ante, setAnte] = useState(1);

  function handleWin() {
    setRound((prev) => prev + 1);
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
        <div className="sub-info">
          <RunInfo />
          <Options />
        </div>
        <div className="progress">
          <RoundProgress />
          <RunProgress ante={ante} round={round} />
        </div>
        <button onClick={handleReset}>Reset</button>
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
    <>
      <h3>{blindValues[blind]}</h3>
      <h4>Score at least: {requiredScore}</h4>
      <p>to earn {award}</p>
    </>
  );
}

function HandScore() {
  return <h3>Two pair</h3>;
}

function RunInfo() {
  return <button>Run info</button>;
}

function Options() {
  return <button>Options</button>;
}

function RoundProgress() {
  return <div>Round Progress</div>;
}

function RunProgress({ ante, round }) {
  return (
    <>
      <p>Ante: {ante}</p>
      <p>Round: {round}</p>
    </>
  );
}

function Game({ onWin }) {
  return <button onClick={onWin}>Win</button>;
}

export default App;
