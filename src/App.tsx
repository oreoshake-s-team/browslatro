import { useEffect, useRef, useState } from "react";
import "./App.css";
import type { Blind, Card, Hand } from "./types";
import { HANDS, BASE_CHIPS, BLIND_MULTIPLIERS, JOKER_BASE_PRICE } from "./constants";
import Game from "./components/game/Game";
import RoundWonModal, { type RoundWonInfo } from "./components/game/RoundWonModal";
import Shop, { type ShopOffer } from "./components/shop/Shop";
import Sidebar from "./components/hud/Sidebar";
import { play } from "./components/system/sounds";
import { isHighVisibility } from "./components/system/preferences";
import { detectHandLabel } from "./handEvaluator";
import { evaluateHand } from "./handEvaluator";
import { getRankChips, getScoringCards, getScoringStep } from "./scoring";
import { createDeck, deal, shuffle, HAND_SIZE, type DealResult } from "./deck";
import { MAX_SELECTED } from "./components/cards/Hand";
import { calculateInterest } from "./payout";
import {
  MAX_JOKERS,
  applyHandLevelJokers,
  applyPerCardJokers,
  computeFinalScoreWithJokers,
  createDefaultJokers,
  sampleShopJokers,
  type Joker,
} from "./jokers";

const SHOP_OFFER_COUNT = 2;

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
  const [handDisplayOrder, setHandDisplayOrder] = useState<ReadonlyArray<number>>(
    [],
  );
  const [jokers, setJokers] = useState<ReadonlyArray<Joker>>(() =>
    createDefaultJokers(),
  );
  const [jokerPulseCounters, setJokerPulseCounters] = useState<
    Readonly<Record<string, number>>
  >({});
  const pendingDiscardCountRef = useRef(0);

  function pulseJokers(firedIds: ReadonlyArray<string>) {
    if (firedIds.length === 0) return;
    setJokerPulseCounters((prev) => {
      const next = { ...prev };
      for (const id of firedIds) {
        next[id] = (next[id] ?? 0) + 1;
      }
      return next;
    });
  }

  // Sequential scoring state.
  const [scoringCards, setScoringCards] = useState<ReadonlyArray<Card>>([]);
  const [scoringIndex, setScoringIndex] = useState<number>(0);
  const scoringFinalizeRef = useRef<(() => void) | null>(null);
  const isScoring = scoringCards.length > 0 && scoringIndex < scoringCards.length;
  const currentScoringId = isScoring ? scoringCards[scoringIndex].id : null;

  // Round-won modal: when non-null, the player has met the required score and
  // the modal is showing. Dismissal triggers handleWin().
  const [pendingWin, setPendingWin] = useState<RoundWonInfo | null>(null);

  const [shopOffers, setShopOffers] = useState<ReadonlyArray<ShopOffer> | null>(
    null,
  );

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
      const { card: stepCard, chips: stepChips } = getScoringStep(
        scoringCards,
        scoringIndex,
      );
      setChips((prev) => prev + stepChips);
      play("pop");
      const cardJokerResult = applyPerCardJokers(jokers, stepCard);
      if (cardJokerResult.moneyEarned > 0) {
        setMoney((prev) => prev + cardJokerResult.moneyEarned);
      }
      pulseJokers(cardJokerResult.firedJokerIds);
      setScoringIndex((prev) => prev + 1);
    }, stepMs);
    return () => window.clearTimeout(timer);
  }, [scoringCards, scoringIndex, jokers]);

  function handleWin() {
    setRound((prev) => prev + 1);
    setMoney((prev) => prev + (blind + 2) + calculateInterest(prev));
    if (blind < 3) {
      setBlind((prev) => (prev + 1) as Blind);
    } else {
      setAnte((prev) => prev + 1);
      setBlind(1);
    }
    setShopOffers(
      sampleShopJokers(SHOP_OFFER_COUNT).map((joker) => ({
        joker,
        sold: false,
      })),
    );
  }

  function buyShopOffer(idx: number) {
    const offer = shopOffers?.[idx];
    if (!offer || offer.sold) return;
    if (jokers.length >= MAX_JOKERS) return;
    if (money < JOKER_BASE_PRICE) return;
    play("pop");
    setMoney((prev) => prev - JOKER_BASE_PRICE);
    setJokers((prev) => [...prev, offer.joker]);
    setShopOffers((current) =>
      current
        ? current.map((o, i) => (i === idx ? { ...o, sold: true } : o))
        : current,
    );
  }

  function closeShopAndStartNextRound() {
    setShopOffers(null);
    startNewRound();
  }

  function startNewGame(): void {
    setBlind(1);
    setRound(1);
    setAnte(1);
    setMoney(0);
    setJokers(createDefaultJokers());
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
    startNewGame();
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

    const handById = new Map(dealt.hand.map((c) => [c.id, c]));
    const playedCards = handDisplayOrder
      .map((id) => handById.get(id))
      .filter((c): c is Card => c !== undefined && selectedIds.has(c.id));
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
    const handJokerResult = applyHandLevelJokers(jokers);
    pulseJokers(handJokerResult.firedJokerIds);

    const finalScore = computeFinalScoreWithJokers(
      handStats.chips,
      handStats.multiplier,
      cardChipsTotal,
      {
        additiveMult: handJokerResult.additiveMult,
        xMult: handJokerResult.xMult,
        moneyEarned: 0,
      },
    );

    const liveMultiplier =
      (handStats.multiplier + handJokerResult.additiveMult) * handJokerResult.xMult;
    setChips(handStats.chips);
    setMultiplier(liveMultiplier);
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
      play("win");
      setPendingWin({
        roundScore: newRoundScore,
        requiredScore,
        baseReward: blind + 2,
        walletAtPayout: money,
        interest: calculateInterest(money),
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
        onNewGame={startNewGame}
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
        jokers={jokers}
        jokerPulseCounters={jokerPulseCounters}
        onToggleCard={toggleCard}
        onCardDiscardEnd={handleCardDiscardEnd}
        onDisplayOrderChange={setHandDisplayOrder}
      />
      {pendingWin && (
        <RoundWonModal info={pendingWin} onContinue={dismissRoundWonModal} />
      )}
      {shopOffers && (
        <Shop
          money={money}
          equippedJokerCount={jokers.length}
          offers={shopOffers}
          pricePerJoker={JOKER_BASE_PRICE}
          onBuy={buyShopOffer}
          onNext={closeShopAndStartNextRound}
        />
      )}
    </div>
  );
}

export default App;
