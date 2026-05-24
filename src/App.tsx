import { useEffect, useState } from "react";
import type { Blind, Hand } from "./types";
import { HANDS, BASE_CHIPS, BLIND_MULTIPLIERS } from "./constants";
import Game from "./components/Game";
import Sidebar from "./components/Sidebar";
import { play } from "./components/sounds";

function App() {
  const [blind, setBlind] = useState<Blind>(1);
  const [round, setRound] = useState(1);
  const [ante, setAnte] = useState(1);
  const [money, setMoney] = useState(0);
  const [chips, setChips] = useState(20);
  const [multiplier, setMultiplier] = useState(2);
  const [roundScore, setRoundScore] = useState(0);
  const [selectedHand, setSelectedHand] = useState<Hand>(HANDS[0]);
  const [remainingHands, setRemainingHands] = useState(4);
  const [remainingDiscards, setRemainingDiscards] = useState(3);

  const requiredScore = BASE_CHIPS[ante - 1] * BLIND_MULTIPLIERS[blind - 1];

  function handleWin() {
    play("win");
    setRound((prev) => prev + 1);
    setMoney((prev) => prev + (blind + 2));
    if (blind < 3) {
      setBlind((prev) => (prev + 1) as Blind);
    } else {
      setAnte((prev) => prev + 1);
      setBlind(1);
    }
    setRoundScore(0);
    setRemainingHands(4);
    setRemainingDiscards(3);
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

  useEffect(() => {
    play("pop");
  }, [chips, multiplier]);

  function addMultiplier(amount: number) {
    setMultiplier((prev) => prev + amount);
  }

  function multiplyMultiplier(factor: number) {
    setMultiplier((prev) => prev * factor);
  }

  function loseGame() {
    play("lose");
    alert("Game Over! Try again.");
    handleReset();
  }

  function submitHand() {
    const newRoundScore = roundScore + chips * multiplier;
    setRoundScore(newRoundScore);
    setChips(20);
    setMultiplier(2);

    if (newRoundScore >= requiredScore) {
      handleWin();
      return;
    }

    if (remainingHands > 1) {
      setRemainingHands((prev) => prev - 1);
    } else {
      loseGame();
    }
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
        requiredScore={requiredScore}
        selectedHand={selectedHand}
        remainingHands={remainingHands}
        remainingDiscards={remainingDiscards}
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
        onSetChips={setChips}
        onSetMultiplier={setMultiplier}
      />
    </div>
  );
}

export default App;
