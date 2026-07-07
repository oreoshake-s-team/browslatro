import { useRef, type MutableRefObject } from "react";
import { useGame } from "../store/game";
import { consumableCapacityFor, handSizeFor } from "../items/capacities";
import { captureHumanDecision } from "../ai/humanPlayWiring";
import type { Card } from "../cards/types";
import {
  applyBossFaceDown,
  bossHandSize,
  bossPostPlayDiscardCount,
  bossRefillCountOverride,
  hookRngConfig,
  pickHookDiscardIds,
} from "../items/bosses";
import { drawCountForRefill } from "../cards/deck";
import {
  addConsumable,
} from "../items/consumables";
import { pickRandomTarot, purpleSealDiscarded } from "../cards/seals";
import {
  applyCardsDestroyedToJokerStates,
  applyDiscardToJokerStates,
  applyOnDiscardJokers,
  isJokerActive,
  resolveJokerEffect,
} from "../items/jokers";
import { cardLabel } from "../scoring/scoringTrace";
import { detectHandLabel } from "../scoring/handEvaluator";
import {
  applyPlanetUpgrade,
  createPlanetCatalog,
  planetForHand,
} from "../items/planets";

export interface UseDiscardPipelineResult {
  readonly pendingDiscardCountRef: MutableRefObject<number>;
  readonly pendingHandPlayResetRef: MutableRefObject<boolean>;
  readonly skipDrawAfterDiscardRef: MutableRefObject<boolean>;
  readonly handleCardDiscardEnd: (card: Card) => void;
  readonly runDiscard: (ids: ReadonlySet<number>) => void;
  readonly discardSelected: () => void;
  readonly resetForNewRound: () => void;
}

export function useDiscardPipeline(): UseDiscardPipelineResult {
  const pendingDiscardCountRef = useRef(0);
  const pendingHandPlayResetRef = useRef(false);
  const skipDrawAfterDiscardRef = useRef(false);

  const dealt = useGame((s) => s.dealt);
  const blind = useGame((s) => s.blind);
  const currentBoss = useGame((s) => s.currentBoss);
  const discardingIds = useGame((s) => s.discardingIds);
  const remainingDiscards = useGame((s) => s.remainingDiscards);
  const handSizeModifier = useGame((s) => s.handSizeModifier);
  const ownedVoucherIds = useGame((s) => s.ownedVoucherIds);
  const jokers = useGame((s) => s.jokers);
  const discardsUsedThisRound = useGame((s) => s.discardsUsedThisRound);
  const setScoringEvents = useGame((s) => s.setScoringEvents);

  const setDealt = useGame((s) => s.setDealt);
  const setSelectedIds = useGame((s) => s.setSelectedIds);
  const setDiscardingIds = useGame((s) => s.setDiscardingIds);
  const setSelectedHand = useGame((s) => s.setSelectedHand);
  const setChips = useGame((s) => s.setChips);
  const setMultiplier = useGame((s) => s.setMultiplier);
  const setHandPlaySignal = useGame((s) => s.setHandPlaySignal);
  const setConsumables = useGame((s) => s.setConsumables);
  const setNewlyDrawnIds = useGame((s) => s.setNewlyDrawnIds);
  const setRemainingDiscards = useGame((s) => s.setRemainingDiscards);
  const setDiscardsUsedThisRound = useGame((s) => s.setDiscardsUsedThisRound);

  const currentHandSize = handSizeFor({
    handSizeModifier,
    ownedVoucherIds,
    jokers,
  });
  const consumableCapacity =
    consumableCapacityFor(ownedVoucherIds);

  function finalizeDiscard(idsToDiscard: ReadonlySet<number>): void {
    const wasHandPlayReset = pendingHandPlayResetRef.current;
    const skippedDraw = skipDrawAfterDiscardRef.current;
    const kept = dealt.hand.filter((c) => !idsToDiscard.has(c.id));
    const hookCount =
      wasHandPlayReset && !skippedDraw && blind === 3
        ? bossPostPlayDiscardCount(currentBoss)
        : 0;
    const hookIds =
      hookCount > 0
        ? pickHookDiscardIds(kept, new Set(), hookCount, hookRngConfig.rng)
        : [];
    const deferRefillForHook = hookIds.length > 0;
    if (skippedDraw) {
      skipDrawAfterDiscardRef.current = false;
      setDealt({ hand: kept, remaining: dealt.remaining });
      setNewlyDrawnIds(new Set());
    } else if (deferRefillForHook) {
      setDealt({ hand: kept, remaining: dealt.remaining });
    } else {
      const effectiveHandSize =
        blind === 3 ? bossHandSize(currentBoss, currentHandSize) : currentHandSize;
      const drawCount = bossRefillCountOverride(
        currentBoss,
        blind === 3,
        drawCountForRefill(
          effectiveHandSize,
          kept.length,
          dealt.remaining.length,
        ),
        dealt.remaining.length,
      );
      const drawn = dealt.remaining.slice(0, drawCount);
      const newRemaining = dealt.remaining.slice(drawCount);
      const drawnWithFaceDown = applyBossFaceDown(
        drawn,
        currentBoss,
        blind === 3,
        wasHandPlayReset ? "refill-after-play" : "refill-after-discard",
      );
      setDealt({ hand: [...kept, ...drawnWithFaceDown], remaining: newRemaining });
      setNewlyDrawnIds(new Set(drawnWithFaceDown.map((c) => c.id)));
    }
    setSelectedIds(new Set());
    setDiscardingIds(new Set());
    setSelectedHand(null);
    setChips(0);
    setMultiplier(0);
    if (wasHandPlayReset) {
      pendingHandPlayResetRef.current = false;
      setHandPlaySignal((prev) => prev + 1);
    }
    if (deferRefillForHook) {
      runDiscard(new Set(hookIds));
    }
  }

  function handleCardDiscardEnd(card: Card): void {
    if (!discardingIds.has(card.id)) return;
    pendingDiscardCountRef.current -= 1;
    if (pendingDiscardCountRef.current <= 0) {
      pendingDiscardCountRef.current = 0;
      finalizeDiscard(discardingIds);
    }
  }

  function runDiscard(ids: ReadonlySet<number>): void {
    if (ids.size === 0) return;

    const currentHand = useGame.getState().dealt.hand;
    const purpleDiscards = purpleSealDiscarded(currentHand, ids);
    if (purpleDiscards.length > 0) {
      setConsumables((prev) => {
        let next = prev;
        for (let i = 0; i < purpleDiscards.length; i += 1) {
          const after = addConsumable(
            next,
            { kind: "tarot", card: pickRandomTarot() },
            consumableCapacity,
          );
          if (after === next) break;
          next = after;
        }
        return next;
      });
    }

    pendingDiscardCountRef.current = ids.size;
    setDiscardingIds(ids);

    const discardedCards = currentHand.filter((c) => ids.has(c.id));
    useGame.getState().setJokers((prev) =>
      applyDiscardToJokerStates(
        prev,
        discardedCards,
        useGame.getState().castleSuit,
      ),
    );
    const onDiscardResult = applyOnDiscardJokers(jokers, discardedCards, {
      discardsUsedThisRound: discardsUsedThisRound + 1,
      rebateRank: useGame.getState().rebateRank,
    });
    if (discardsUsedThisRound === 0) {
      const activeJokersForDiscard = jokers.filter(isJokerActive);
      let upgradeCount = 0;
      for (let i = 0; i < activeJokersForDiscard.length; i += 1) {
        if (resolveJokerEffect(activeJokersForDiscard, i).kind === "first-discard-upgrades-hand") upgradeCount += 1;
      }
      if (upgradeCount > 0) {
        const discardedLabel = detectHandLabel(discardedCards);
        const planet =
          discardedLabel !== null
            ? planetForHand(createPlanetCatalog(), discardedLabel)
            : null;
        if (planet && discardedLabel !== null) {
          for (let u = 0; u < upgradeCount; u += 1) {
            useGame.getState().setHandStats((prev) => applyPlanetUpgrade(prev, planet));
          }
          setScoringEvents((prev) => [
            ...prev,
            {
              kind: "hand-upgraded",
              handLabel: discardedLabel,
              level: useGame.getState().handStats[discardedLabel].level,
              source: "Burnt Joker",
            },
          ]);
        }
      }
    }
    for (const step of onDiscardResult.steps) {
      useGame.getState().earn(step.moneyEarned);
      setScoringEvents((prev) => [
        ...prev,
        {
          kind: "money-delta",
          amount: step.moneyEarned,
          source: step.jokerName,
        },
      ]);
      if (step.destroyedCardId !== undefined) {
        const id = step.destroyedCardId;
        useGame.getState().setDestroyedCardIds((prev) => {
          if (prev.has(id)) return prev;
          const next = new Set(prev);
          next.add(id);
          return next;
        });
        const destroyed = discardedCards.find((c) => c.id === id);
        if (destroyed) {
          useGame
            .getState()
            .setJokers((prev) =>
              applyCardsDestroyedToJokerStates(prev, [destroyed]),
            );
          setScoringEvents((prev) => [
            ...prev,
            {
              kind: "card-destroyed",
              cardLabel: cardLabel(destroyed),
              source: step.jokerName,
            },
          ]);
        }
      }
    }
  }

  function discardSelected(): void {
    const liveSelectedIds = useGame.getState().selectedIds;
    if (discardingIds.size > 0) return;
    if (liveSelectedIds.size === 0) return;
    if (remainingDiscards <= 0) return;

    captureHumanDecision(useGame.getState(), {
      kind: "discard",
      cardIds: [...liveSelectedIds],
    });

    runDiscard(liveSelectedIds);
    setRemainingDiscards((prev) => prev - 1);
    setDiscardsUsedThisRound((prev) => prev + 1);
  }

  function resetForNewRound(): void {
    pendingDiscardCountRef.current = 0;
    pendingHandPlayResetRef.current = false;
    skipDrawAfterDiscardRef.current = false;
  }

  return {
    pendingDiscardCountRef,
    pendingHandPlayResetRef,
    skipDrawAfterDiscardRef,
    handleCardDiscardEnd,
    runDiscard,
    discardSelected,
    resetForNewRound,
  };
}
