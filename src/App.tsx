import { useState } from "react";
import type { Blind } from "./types";
import Game, { HANDS } from "./components/Game";
import type { Hand } from "./components/Game";
import Sidebar from "./components/Sidebar";

function App() {
  const [blind, setBlind] = useState<Blind>(1);
  const [round, setRound] = useState(1);
  const [ante, setAnte] = useState(1);
  const [money, setMoney] = useState(0);
  const [chips, setChips] = useState(20);
  const [multiplier, setMultiplier] = useState(2);
  const [roundScore, setRoundScore] = useState(0);
  const [selectedHand, setSelectedHand] = useState<Hand>(HANDS[0]);

  function handleWin() {
    setRound((prev) => prev + 1);
    setMoney((prev) => prev + (blind + 2));
    if (blind < 3) {
      setBlind((prev) => (prev + 1) as Blind);
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

  function addChips(amount: number) {
    setChips((prev) => prev + amount);
  }

  function addMultiplier(amount: number) {
    setMultiplier((prev) => prev + amount);
  }

  function multiplyMultiplier(factor: number) {
    setMultiplier((prev) => prev * factor);
  }

  function submitHand() {
    setRoundScore((prev) => prev + chips * multiplier);
    setChips(20);
    setMultiplier(2);
  }

  return (
    <div className="App">
      <Sidebar
        blind={blind}
        ante={ante}
        round={round}
        money={money}
        chips={chips}
        multiplier={multiplier}
        roundScore={roundScore}
        selectedHand={selectedHand}
        handleReset={handleReset}
      />
      <Game
        onWin={handleWin}
        onAddChips={addChips}
        onAddMultiplier={addMultiplier}
        onMultiplyMultiplier={multiplyMultiplier}
        onSetMoney={setMoney}
        onSubmitHand={submitHand}
        selectedHand={selectedHand}
        onSelectHand={setSelectedHand}
      />
    </div>
  );
}

export default App;
