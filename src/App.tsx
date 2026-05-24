import { useEffect, useRef, useState } from "react";
import "./App.css";
import type { Blind, Card, Hand } from "./types";
import { HANDS, BASE_CHIPS, BLIND_MULTIPLIERS } from "./constants";
import Game from "./components/Game";
import Sidebar from "./components/Sidebar";
import RoundWonModal, { type RoundWonInfo } from "./components/RoundWonModal";
import { play } from "./components/sounds";
import { isHighVisibility } from "./components/preferences";
import { detectHandLabel } from "./handEvaluator";
import { evaluateHand } from "./handEvaluator";
import { getRankChips, getScoringCards } from "./scoring";
import { createDeck, deal, shuffle, HAND_SIZE, type DealResult } from "./deck";
import { MAX_SELECTED } from "./components/Hand";

// Per-card delay in the scoring sequence. Each scoring card animates and adds
// its chip contribution after this many milliseconds.
export const SCORING_STEP_MS = 200;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

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

  // Sequential scoring state.
  const [scoringCards, setScoringCards] = useState<ReadonlyArray<Card>>([]);
  const [scoringIndex, setScoringIndex] = useState<number>(0);
  const scoringFinalizeRef = useRef<(() => void) | null>(null);
  const isScoring = scoringCards.length > 0 && scoringIndex < scoringCards.length;
  const currentScoringId = isScoring ? scoringCards[scoringIndex].id : null;

  // Round-won modal: when non-null, the player has met the required score and
  // the modal is showing. Dismissal triggers handleWin().
  const [pendingWin, setPendingWin] = useState<RoundWonInfo | null>(null);

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
    setScoringCards([]);
    setScoringIndex(0);
    scoringFinalizeRef.current = null;
    setPendingWin(null);
  }

  // Drive the scoring sequence: tick one card per SCORING_STEP_MS, then call
  // the stored finalize callback when the queue drains. The useEffect cleanup
  // cancels any pending step when state changes (e.g. game reset).
  useEffect(() => {
    if (scoringCards.length === 0) return;

    if (scoringIndex >= scoringCards.length) {
      const finalize = scoringFinalizeRef.current;
      if (finalize) {
        scoringFinalizeRef.current = null;
        finalize();
      }
      return;
    }

    const stepMs = prefersReducedMotion() ? 0 : SCORING_STEP_MS;
    const timer = window.setTimeout(() => {
      const card = scoringCards[scoringIndex];
      setChips((prev) => prev + getRankChips(card.rank));
      play("pop");
      setScoringIndex((prev) => prev + 1);
    }, stepMs);
    return () => window.clearTimeout(timer);
  }, [scoringCards, scoringIndex]);

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
    if (isScoring) return;
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
    if (isScoring) return;

    const playedCards = dealt.hand.filter((c) => selectedIds.has(c.id));
    const submittedSelection = selectedIds;

    if (playedCards.length === 0) {
      // Empty submission: no scoring sequence, finalize directly.
      finalizeHandSubmission(0, submittedSelection);
      return;
    }

    const label = detectHandLabel(playedCards);
    const handStats = evaluateHand(playedCards);
    const scoring = getScoringCards(playedCards, label);
    const cardChipsTotal = scoring.reduce(
      (sum, card) => sum + getRankChips(card.rank),
      0,
    );
    const finalScore = Math.floor(
      (handStats.chips + cardChipsTotal) * handStats.multiplier,
    );

    // Reset the live counters to the hand's base values so the ticking is
    // observable against the starting point, then queue the per-card sequence.
    setChips(handStats.chips);
    setMultiplier(handStats.multiplier);
    scoringFinalizeRef.current = () => {
      finalizeHandSubmission(finalScore, submittedSelection);
    };
    setScoringCards(scoring);
    setScoringIndex(0);
  }

  function finalizeHandSubmission(
    score: number,
    submittedSelection: ReadonlySet<number>,
  ) {
    const newRoundScore = roundScore + score;
    setRoundScore(newRoundScore);
    setChips(20);
    setMultiplier(2);
    setScoringCards([]);
    setScoringIndex(0);

    if (submittedSelection.size > 0) {
      pendingDiscardCountRef.current = submittedSelection.size;
      setDiscardingIds(submittedSelection);
    }

    if (newRoundScore >= requiredScore) {
      // Show the round-won modal instead of immediately advancing. The modal's
      // Continue button calls handleWin(), which moves to the next blind/ante.
      setPendingWin({
        roundScore: newRoundScore,
        requiredScore,
        baseReward: blind + 2,
      });
      return;
    }

    if (remainingHands > 1) {
      setRemainingHands((prev) => prev - 1);
    } else {
      loseGame();
    }
  }

  function dismissRoundWonModal() {
    setPendingWin(null);
    handleWin();
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
          discardingIds.size === 0 &&
          !isScoring
        }
        isScoring={isScoring}
        scoringId={currentScoringId}
        selectedHand={selectedHand}
        hand={dealt.hand}
        remaining={dealt.remaining}
        selectedIds={selectedIds}
        discardingIds={discardingIds}
        onToggleCard={toggleCard}
        onCardDiscardEnd={handleCardDiscardEnd}
      />
      {pendingWin && (
        <RoundWonModal info={pendingWin} onContinue={dismissRoundWonModal} />
      )}
    </div>
  );
}

export default App;
