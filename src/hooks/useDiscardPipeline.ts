import { useRef, type MutableRefObject } from "react";
import { useGame } from "../store/game";
import type { Card } from "../cards/types";
import { applyBossFaceDown, bossHandSize } from "../items/bosses";
import { drawCountForRefill, HAND_SIZE } from "../cards/deck";
import {
  extraConsumableSlots,
  extraHandSize,
} from "../items/vouchers";
import {
  MAX_CONSUMABLE_SLOTS,
  addConsumable,
} from "../items/consumables";
import { pickRandomTarot, purpleSealDiscarded } from "../cards/seals";

export interface UseDiscardPipelineResult {
  readonly pendingDiscardCountRef: MutableRefObject<number>;
  readonly pendingHandPlayResetRef: MutableRefObject<boolean>;
  readonly skipDrawAfterDiscardRef: MutableRefObject<boolean>;
  readonly handleCardDiscardEnd: (card: Card) => void;
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
  const selectedIds = useGame((s) => s.selectedIds);
  const remainingDiscards = useGame((s) => s.remainingDiscards);
  const handSizeModifier = useGame((s) => s.handSizeModifier);
  const ownedVoucherIds = useGame((s) => s.ownedVoucherIds);

  const setDealt = useGame((s) => s.setDealt);
  const setSelectedIds = useGame((s) => s.setSelectedIds);
  const setDiscardingIds = useGame((s) => s.setDiscardingIds);
  const setSelectedHand = useGame((s) => s.setSelectedHand);
  const setChips = useGame((s) => s.setChips);
  const setMultiplier = useGame((s) => s.setMultiplier);
  const setHandPlaySignal = useGame((s) => s.setHandPlaySignal);
  const setConsumables = useGame((s) => s.setConsumables);
  const setRemainingDiscards = useGame((s) => s.setRemainingDiscards);
  const setDiscardsUsedThisRound = useGame((s) => s.setDiscardsUsedThisRound);

  const currentHandSize = Math.max(
    1,
    HAND_SIZE + handSizeModifier + extraHandSize(ownedVoucherIds),
  );
  const consumableCapacity =
    MAX_CONSUMABLE_SLOTS + extraConsumableSlots(ownedVoucherIds);

  function finalizeDiscard(idsToDiscard: ReadonlySet<number>): void {
    const kept = dealt.hand.filter((c) => !idsToDiscard.has(c.id));
    if (skipDrawAfterDiscardRef.current) {
      skipDrawAfterDiscardRef.current = false;
      setDealt({ hand: kept, remaining: dealt.remaining });
    } else {
      const effectiveHandSize =
        blind === 3 ? bossHandSize(currentBoss, currentHandSize) : currentHandSize;
      const drawCount = drawCountForRefill(
        effectiveHandSize,
        kept.length,
        dealt.remaining.length,
      );
      const drawn = dealt.remaining.slice(0, drawCount);
      const newRemaining = dealt.remaining.slice(drawCount);
      const drawnWithFaceDown = applyBossFaceDown(
        drawn,
        currentBoss,
        blind === 3,
        "refill",
      );
      setDealt({ hand: [...kept, ...drawnWithFaceDown], remaining: newRemaining });
    }
    setSelectedIds(new Set());
    setDiscardingIds(new Set());
    setSelectedHand(null);
    setChips(0);
    setMultiplier(0);
    if (pendingHandPlayResetRef.current) {
      pendingHandPlayResetRef.current = false;
      setHandPlaySignal((prev) => prev + 1);
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

  function discardSelected(): void {
    if (discardingIds.size > 0) return;
    if (selectedIds.size === 0) return;
    if (remainingDiscards <= 0) return;

    const purpleDiscards = purpleSealDiscarded(dealt.hand, selectedIds);
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

    pendingDiscardCountRef.current = selectedIds.size;
    setDiscardingIds(selectedIds);
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
    discardSelected,
    resetForNewRound,
  };
}
