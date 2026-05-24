import { useRef, useState } from "react";
import "./App.css";
import type { Blind, Card, Hand } from "./types";
import { HANDS, BASE_CHIPS, BLIND_MULTIPLIERS } from "./constants";
import Game from "./components/Game";
import Sidebar from "./components/Sidebar";
import { play } from "./components/sounds";
import { isHighVisibility } from "./components/preferences";
import { evaluateHand } from "./handEvaluator";
import { createDeck, deal, shuffle, HAND_SIZE, type DealResult } from "./deck";
import { MAX_SELECTED } from "./components/Hand";

function initialDeal(): DealResult {
  return deal(shuffle(createDeck()), HAND_SIZE);
}

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
  const [dealt, setDealt] = useState<DealResult>(initialDeal);
  const [highVisibility, setHighVisibility] = useState<boolean>(isHighVisibility);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<number>>(
    () => new Set(),
  );
  const [discardingIds, setDiscardingIds] = useState<ReadonlySet<number>>(
    () => new Set(),
  );
  const pendingDiscardCountRef = useRef(0);

  const requiredScore = BASE_CHIPS[ante - 1] * BLIND_MULTIPLIERS[blind - 1];

  function startNewRound() {
    setRoundScore(0);
    setRemainingHands(4);
    setRemainingDiscards(3);
    setDealt(initialDeal());
    setSelectedIds(new Set());
    setDiscardingIds(new Set());
    setSelectedHand(HANDS[0]);
    setChips(20);
    setMultiplier(2);
    pendingDiscardCountRef.current = 0;
  }

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
    startNewRound();
  }

  function handleReset(): void {
    setBlind(1);
    setRound(1);
    setAnte(1);
    setMoney(0);
    startNewRound();
  }

  function addChips(amount: number) {
    play("pop");
    setChips((prev) => prev + amount);
  }

  function addMultiplier(amount: number) {
    play("pop");
    setMultiplier((prev) => prev + amount);
  }

  function multiplyMultiplier(factor: number) {
    play("pop");
    setMultiplier((prev) => prev * factor);
  }

  function loseGame() {
    play("lose");
    alert("Game Over! Try again.");
    handleReset();
  }

  function toggleCard(card: Card) {
    if (discardingIds.size > 0) return;
    let nextIds: Set<number>;
    if (selectedIds.has(card.id)) {
      nextIds = new Set(selectedIds);
      nextIds.delete(card.id);
    } else {
      if (selectedIds.size >= MAX_SELECTED) return;
      nextIds = new Set(selectedIds);
      nextIds.add(card.id);
    }
    setSelectedIds(nextIds);
    const nextSelected = dealt.hand.filter((c) => nextIds.has(c.id));
    const hand = evaluateHand(nextSelected);
    setSelectedHand(hand);
    setChips(hand.chips);
    setMultiplier(hand.multiplier);
  }

  function finalizeDiscard(idsToDiscard: ReadonlySet<number>) {
    const kept = dealt.hand.filter((c) => !idsToDiscard.has(c.id));
    const drawCount = dealt.hand.length - kept.length;
    const drawn = dealt.remaining.slice(0, drawCount);
    const newRemaining = dealt.remaining.slice(drawCount);
    setDealt({ hand: [...kept, ...drawn], remaining: newRemaining });
    setSelectedIds(new Set());
    setDiscardingIds(new Set());
    setSelectedHand(HANDS[0]);
  }

  function handleCardDiscardEnd(card: Card) {
    if (!discardingIds.has(card.id)) return;
    pendingDiscardCountRef.current -= 1;
    if (pendingDiscardCountRef.current <= 0) {
      pendingDiscardCountRef.current = 0;
      finalizeDiscard(discardingIds);
    }
  }

  function submitHand() {
    if (discardingIds.size > 0) return;

    const newRoundScore = roundScore + chips * multiplier;
    setRoundScore(newRoundScore);
    setChips(20);
    setMultiplier(2);

    if (selectedIds.size > 0) {
      pendingDiscardCountRef.current = selectedIds.size;
      setDiscardingIds(selectedIds);
    }

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

  function discardSelected() {
    if (discardingIds.size > 0) return;
    if (selectedIds.size === 0) return;
    if (remainingDiscards <= 0) return;

    pendingDiscardCountRef.current = selectedIds.size;
    setDiscardingIds(selectedIds);
    setRemainingDiscards((prev) => prev - 1);
  }

  return (
    <div className={`App ${highVisibility ? "high-visibility" : ""}`.trim()}>
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
        onHighVisibilityChange={setHighVisibility}
      />
      <Game
        onWin={handleWin}
        onAddChips={addChips}
        onAddMultiplier={addMultiplier}
        onMultiplyMultiplier={multiplyMultiplier}
        onSetMoney={setMoney}
        onSubmitHand={submitHand}
        onDiscard={discardSelected}
        canDiscard={
          selectedIds.size > 0 &&
          remainingDiscards > 0 &&
          discardingIds.size === 0
        }
        selectedHand={selectedHand}
        hand={dealt.hand}
        remaining={dealt.remaining}
        selectedIds={selectedIds}
        discardingIds={discardingIds}
        onToggleCard={toggleCard}
        onCardDiscardEnd={handleCardDiscardEnd}
      />
    </div>
  );
}

export default App;
