import { useState } from "react";
import Game from "./components/Game";
import Sidebar from "./components/Sidebar";

export const BlindValues = {
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
      <Sidebar
        blind={blind}
        ante={ante}
        round={round}
        money={money}
        handleReset={handleReset}
      />

      <Game onWin={handleWin} />
    </div>
  );
}

export default App;
