import "./App.css";

function App() {
  return (
    <div className="App">
      <div className="sidebar">
        <Round />
        <HandScore />
        <div className="sub-info">
          <RunInfo />
          <Options />
        </div>
        <div className="progress">
          <RoundProgress />
          <RunProgress />
        </div>
      </div>
      <Game />
    </div>
  );
}

function Round() {
  return <div>Big Blind</div>;
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

function RunProgress() {
  return <div>Run Progress</div>;
}

function Game() {
  return <div>Game</div>;
}

export default App;
