import { useState } from "react";
import Round from "./components/Round";
import HandScore from "./components/HandScore";
import RunInfo from "./components/RunInfo";
import Options from "./components/Options";
import RoundProgress from "./components/RoundProgress";
import RunProgress from "./components/RunProgress";
import Game from "./components/Game";

const blindValues = {
  1: "Small Blind",
  2: "Big Blind",
  3: "Boss Blind",
};

function App() {
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
    setMoney(0);
  }

  return (
    <div className="App">
      <div className="sidebar">
        <Round blind={blind} ante={ante} blindValues={blindValues} />
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

export default App;