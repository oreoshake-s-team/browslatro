import { useEffect, useRef, useState } from "react";
import "./App.css";
import type { Blind, Card, Hand } from "./types";
import { BASE_CHIPS, BLIND_MULTIPLIERS, JOKER_BASE_PRICE } from "./constants";
import Game from "./components/game/Game";
import RoundWonModal, { type RoundWonInfo } from "./components/game/RoundWonModal";
import Shop, { type ShopOffer } from "./components/shop/Shop";
import Sidebar from "./components/hud/Sidebar";
import {
  emptyHandCounts,
  type HandPlayCounts,
} from "./components/hud/RunInfo";
import { play } from "./components/system/sounds";
import {
  getAnimationSpeed,
  getAnimationSpeedMultiplier,
  hasUserOverriddenAnimationSpeed,
  isHighVisibility,
  type AnimationSpeed,
} from "./components/system/preferences";
import { detectHandLabel } from "./handEvaluator";
import { evaluateHand } from "./handEvaluator";
import {
  getCardChips,
  getCardMultDelta,
  getScoringCards,
  getScoringStep,
} from "./scoring";
import {
  cardKey,
  createDeck,
  deal,
  shuffle,
  HAND_SIZE,
  type DealResult,
} from "./deck";
import { MAX_SELECTED } from "./components/cards/Hand";
import { calculateInterest, GOLD_HELD_BONUS_PER_CARD } from "./payout";
import { steelHeldMultiplier } from "./heldInHand";
import { applyCardEnhancement, rollEnhancementChance } from "./enhancements";
import {
  MAX_JOKERS,
  applyHandLevelJokers,
  applyPerCardJokers,
  applyPostHandJokers,
  computeFinalScoreWithJokers,
  createDefaultJokers,
  createJokerCatalog,
  type Joker,
  type JokerPostHandStep,
} from "./jokers";
import { SHOP_OFFER_SLOTS, pickShopJokers } from "./shop";

export const SCORING_STEP_MS = 500;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function getScoringStepMs(
  speed: AnimationSpeed = getAnimationSpeed(),
): number {
  if (hasUserOverriddenAnimationSpeed(speed)) {
    return Math.round(SCORING_STEP_MS * getAnimationSpeedMultiplier(speed));
  }
  if (prefersReducedMotion()) return 0;
  return SCORING_STEP_MS;
}

function initialDeal(
  excludedKeys: ReadonlySet<string> = new Set(),
): DealResult {
  return deal(shuffle(createDeck(excludedKeys)), HAND_SIZE);
}

function App() {
  const [blind, setBlind] = useState<Blind>(1);
  const [round, setRound] = useState(1);
  const [ante, setAnte] = useState(1);
  const [money, setMoney] = useState(4);
  const [chips, setChips] = useState(0);
  const [multiplier, setMultiplier] = useState(0);
  const [roundScore, setRoundScore] = useState(0);
  const [selectedHand, setSelectedHand] = useState<Hand | null>(null);
  const [remainingHands, setRemainingHands] = useState(4);
  const [remainingDiscards, setRemainingDiscards] = useState(3);
  const [dealt, setDealt] = useState<DealResult>(initialDeal);
  const [highVisibility, setHighVisibility] = useState<boolean>(isHighVisibility);
  const [animationSpeed, setAnimationSpeedState] = useState<AnimationSpeed>(
    getAnimationSpeed,
  );
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
  const [handPlayCounts, setHandPlayCounts] = useState<HandPlayCounts>(
    emptyHandCounts,
  );
  const pendingDiscardCountRef = useRef(0);
  const [destroyedCardKeys, setDestroyedCardKeys] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

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

  const [goldScoringIds, setGoldScoringIds] = useState<ReadonlyArray<number>>([]);
  const [goldScoringIndex, setGoldScoringIndex] = useState<number>(0);
  const goldFinalizeRef = useRef<(() => void) | null>(null);
  const currentGoldScoringId =
    goldScoringIds.length > 0 && goldScoringIndex < goldScoringIds.length
      ? goldScoringIds[goldScoringIndex]
      : null;

  const [postHandSteps, setPostHandSteps] = useState<
    ReadonlyArray<JokerPostHandStep>
  >([]);
  const [postHandIndex, setPostHandIndex] = useState<number>(0);
  const postHandFinalizeRef = useRef<(() => void) | null>(null);

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
    setDealt(initialDeal(destroyedCardKeys));
    setSelectedIds(new Set());
    setDiscardingIds(new Set());
    setSelectedHand(null);
    setChips(0);
    setMultiplier(0);
    pendingDiscardCountRef.current = 0;
    setScoringCards([]);
    setScoringIndex(0);
    scoringFinalizeRef.current = null;
    setGoldScoringIds([]);
    setGoldScoringIndex(0);
    goldFinalizeRef.current = null;
    setPostHandSteps([]);
    setPostHandIndex(0);
    postHandFinalizeRef.current = null;
    setPendingWin(null);
  }

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

    const stepMs = getScoringStepMs(animationSpeed);
    const timer = window.setTimeout(() => {
      const { card: stepCard, chips: stepChips } = getScoringStep(
        scoringCards,
        scoringIndex,
      );
      setChips((prev) => prev + stepChips);
      play("pop");
      const enhancementEffect = applyCardEnhancement(stepCard);
      if (enhancementEffect.multDelta > 0) {
        setMultiplier((prev) => prev + enhancementEffect.multDelta);
      }
      if (enhancementEffect.multTimes !== 1) {
        setMultiplier((prev) => prev * enhancementEffect.multTimes);
      }
      if (rollEnhancementChance(enhancementEffect.destroyChance)) {
        const key = cardKey(stepCard);
        setDestroyedCardKeys((prev) => {
          if (prev.has(key)) return prev;
          const next = new Set(prev);
          next.add(key);
          return next;
        });
      }
      const cardJokerResult = applyPerCardJokers(jokers, stepCard);
      if (cardJokerResult.moneyEarned > 0) {
        setMoney((prev) => prev + cardJokerResult.moneyEarned);
      }
      if (cardJokerResult.additiveMult > 0) {
        setMultiplier((prev) => prev + cardJokerResult.additiveMult);
      }
      pulseJokers(cardJokerResult.firedJokerIds);
      setScoringIndex((prev) => prev + 1);
    }, stepMs);
    return () => window.clearTimeout(timer);
  }, [scoringCards, scoringIndex, jokers, animationSpeed]);

  useEffect(() => {
    if (goldScoringIds.length === 0) return;
    if (goldScoringIndex >= goldScoringIds.length) {
      const finalize = goldFinalizeRef.current;
      goldFinalizeRef.current = null;
      setGoldScoringIds([]);
      setGoldScoringIndex(0);
      if (finalize) finalize();
      return;
    }
    const stepMs = getScoringStepMs(animationSpeed);
    const timer = window.setTimeout(() => {
      setMoney((prev) => prev + GOLD_HELD_BONUS_PER_CARD);
      play("gold");
      setGoldScoringIndex((prev) => prev + 1);
    }, stepMs);
    return () => window.clearTimeout(timer);
  }, [goldScoringIds, goldScoringIndex, animationSpeed]);

  useEffect(() => {
    if (postHandSteps.length === 0) return;
    if (postHandIndex >= postHandSteps.length) {
      const finalize = postHandFinalizeRef.current;
      postHandFinalizeRef.current = null;
      setPostHandSteps([]);
      setPostHandIndex(0);
      if (finalize) finalize();
      return;
    }
    const stepMs = getScoringStepMs(animationSpeed);
    const timer = window.setTimeout(() => {
      const step = postHandSteps[postHandIndex];
      setMultiplier((prev) => prev * step.xMultFactor);
      play("pop");
      pulseJokers([step.jokerId]);
      setPostHandIndex((prev) => prev + 1);
    }, stepMs);
    return () => window.clearTimeout(timer);
  }, [postHandSteps, postHandIndex, animationSpeed]);

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
      pickShopJokers(
        createJokerCatalog(),
        jokers.map((j) => j.id),
        SHOP_OFFER_SLOTS,
      ).map((joker) => ({
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

  function rerollShopOffers(cost: number) {
    if (!shopOffers) return;
    if (money < cost) return;
    const soldOfferIds = shopOffers
      .filter((o) => o.sold)
      .map((o) => o.joker.id);
    const excludedIds = [...jokers.map((j) => j.id), ...soldOfferIds];
    const unsoldCount = shopOffers.filter((o) => !o.sold).length;
    const replacements = pickShopJokers(
      createJokerCatalog(),
      excludedIds,
      unsoldCount,
    );
    play("pop");
    setMoney((prev) => prev - cost);
    setShopOffers((current) => {
      if (!current) return current;
      let cursor = 0;
      return current.map((offer) => {
        if (offer.sold) return offer;
        const replacement = replacements[cursor];
        cursor += 1;
        if (!replacement) return offer;
        return { joker: replacement, sold: false };
      });
    });
  }

  function closeShopAndStartNextRound() {
    setShopOffers(null);
    startNewRound();
  }

  function reorderJokers(orderedIds: ReadonlyArray<string>) {
    setJokers((prev) => {
      const byId = new Map(prev.map((j) => [j.id, j]));
      const ordered = orderedIds.flatMap((id) => byId.get(id) ?? []);
      const seen = new Set(orderedIds);
      return [...ordered, ...prev.filter((j) => !seen.has(j.id))];
    });
  }

  function startNewGame(): void {
    setBlind(1);
    setRound(1);
    setAnte(1);
    setMoney(4);
    setJokers(createDefaultJokers());
    setHandPlayCounts(emptyHandCounts());
    setDestroyedCardKeys(new Set());
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
    if (nextIds.size === 0) {
      setSelectedHand(null);
      setChips(0);
      setMultiplier(0);
      return;
    }
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
    setSelectedHand(null);
    setChips(0);
    setMultiplier(0);
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
    setHandPlayCounts((prev) => ({ ...prev, [label]: prev[label] + 1 }));
    const handStats = evaluateHand(playedCards);
    const scoring = getScoringCards(playedCards, label);
    const cardChipsTotal = scoring.reduce(
      (sum, card) => sum + getCardChips(card),
      0,
    );
    const handJokerResult = applyHandLevelJokers(jokers, {
      playedHandLabel: label,
    });
    pulseJokers(handJokerResult.firedJokerIds);

    let perCardAdditiveMult = 0;
    for (let i = 0; i < scoring.length; i += 1) {
      perCardAdditiveMult += applyPerCardJokers(jokers, scoring[i]).additiveMult;
      perCardAdditiveMult += getCardMultDelta(scoring[i]);
    }

    const steelMult = steelHeldMultiplier(dealt.hand, submittedSelection);
    const enhancementXMult = scoring.reduce(
      (m, card) => m * applyCardEnhancement(card).multTimes,
      1,
    );
    const preHandXMult = handJokerResult.xMult * steelMult * enhancementXMult;
    const postHandResult = applyPostHandJokers(jokers);
    const totalXMult = preHandXMult * postHandResult.xMult;

    const finalScore = computeFinalScoreWithJokers(
      handStats.chips,
      handStats.multiplier,
      cardChipsTotal,
      {
        additiveMult: handJokerResult.additiveMult + perCardAdditiveMult,
        xMult: totalXMult,
        moneyEarned: 0,
      },
    );

    const liveMultiplier =
      (handStats.multiplier + handJokerResult.additiveMult) * preHandXMult;
    setChips(handStats.chips);
    setMultiplier(liveMultiplier);
    scoringFinalizeRef.current = () => {
      if (postHandResult.steps.length === 0) {
        finalizeHandSubmission(finalScore, submittedSelection);
        return;
      }
      postHandFinalizeRef.current = () => {
        finalizeHandSubmission(finalScore, submittedSelection);
      };
      setPostHandSteps(postHandResult.steps);
      setPostHandIndex(0);
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
    setChips(0);
    setMultiplier(0);
    setSelectedHand(null);
    setScoringCards([]);
    setScoringIndex(0);

    if (submittedSelection.size > 0) {
      pendingDiscardCountRef.current = submittedSelection.size;
      setDiscardingIds(submittedSelection);
    }

    if (newRoundScore >= requiredScore) {
      const heldGoldIds = dealt.hand
        .filter((c) => c.enhancement === "gold" && !submittedSelection.has(c.id))
        .map((c) => c.id);
      const postGoldWallet = money + heldGoldIds.length * GOLD_HELD_BONUS_PER_CARD;
      const openModal = () => {
        play("win");
        setPendingWin({
          roundScore: newRoundScore,
          requiredScore,
          baseReward: blind + 2,
          walletAtPayout: postGoldWallet,
          interest: calculateInterest(postGoldWallet),
          goldHeldCount: heldGoldIds.length,
        });
      };
      if (heldGoldIds.length === 0) {
        openModal();
        return;
      }
      goldFinalizeRef.current = openModal;
      setGoldScoringIds(heldGoldIds);
      setGoldScoringIndex(0);
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

  const appStyle = hasUserOverriddenAnimationSpeed(animationSpeed)
    ? ({
        "--animation-speed": String(getAnimationSpeedMultiplier(animationSpeed)),
      } as React.CSSProperties)
    : undefined;

  return (
    <div
      className={`App ${highVisibility ? "high-visibility" : ""}`.trim()}
      style={appStyle}
    >
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
        handPlayCounts={handPlayCounts}
        onNewGame={startNewGame}
        onHighVisibilityChange={setHighVisibility}
        onAnimationSpeedChange={setAnimationSpeedState}
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
        goldScoringId={currentGoldScoringId}
        hand={dealt.hand}
        remaining={dealt.remaining}
        selectedIds={selectedIds}
        discardingIds={discardingIds}
        jokers={jokers}
        jokerPulseCounters={jokerPulseCounters}
        onToggleCard={toggleCard}
        onCardDiscardEnd={handleCardDiscardEnd}
        onDisplayOrderChange={setHandDisplayOrder}
        onReorderJokers={reorderJokers}
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
          onReroll={rerollShopOffers}
          onNext={closeShopAndStartNextRound}
        />
      )}
    </div>
  );
}

export default App;
