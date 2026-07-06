import { useCallback, useMemo } from "react";
import { useGame } from "../store/game";
import { hasFreeConsumableSlot, MAX_CONSUMABLE_SLOTS } from "../items/consumables";
import {
  MAX_JOKERS,
  effectiveJokerCount,
} from "../items/jokers";
import { extraConsumableSlots, extraJokerSlots } from "../items/vouchers";
import { deckJokerSlotsDelta } from "../items/decks";
import type { PackOpenModalProps } from "../components/shop/PackOpenModal";
import { useOpenedPackPicker } from "./useOpenedPackPicker";

export function usePackOpenController(): PackOpenModalProps | undefined {
  const openedPack = useGame((s) => s.openedPack);
  const packPicksRemaining = useGame((s) => s.packPicksRemaining);
  const packPreviewHand = useGame((s) => s.packPreviewHand);
  const packPreviewSelectedIds = useGame((s) => s.packPreviewSelectedIds);
  const pickedPackOptionIndices = useGame((s) => s.pickedPackOptionIndices);
  const setPackPreviewSelectedIds = useGame((s) => s.setPackPreviewSelectedIds);
  const setPackPreviewDisplayOrder = useGame((s) => s.setPackPreviewDisplayOrder);
  const closeOpenedPack = useGame((s) => s.closeOpenedPack);
  const consumables = useGame((s) => s.consumables);
  const jokers = useGame((s) => s.jokers);
  const ownedVoucherIds = useGame((s) => s.ownedVoucherIds);
  const selectedDeck = useGame((s) => s.selectedDeck);

  const { pickFromOpenedPack } = useOpenedPackPicker();

  const consumableCapacity = useMemo(() => (
    MAX_CONSUMABLE_SLOTS + extraConsumableSlots(ownedVoucherIds)
  ), [ownedVoucherIds]);

  const jokerCapacity = useMemo(
    () => Math.max(0, MAX_JOKERS + extraJokerSlots(ownedVoucherIds) + deckJokerSlotsDelta(selectedDeck)),
    [ownedVoucherIds, selectedDeck],
  );

  const onSelectPreviewCard = useCallback(
    (cardId: number) => {
      if (packPreviewHand.length === 0) return;
      setPackPreviewSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(cardId)) next.delete(cardId);
        else next.add(cardId);
        return next;
      });
    },
    [packPreviewHand.length, setPackPreviewSelectedIds],
  );

  const onReorderPreview = useCallback(
    (orderedIds: ReadonlyArray<number>) => setPackPreviewDisplayOrder(orderedIds),
    [setPackPreviewDisplayOrder],
  );

  return useMemo<PackOpenModalProps | undefined>(() => {
    if (!openedPack) return undefined;
    return {
      pack: openedPack,
      picksRemaining: packPicksRemaining,
      pickedIndices: pickedPackOptionIndices,
      consumableSlotsFull: !hasFreeConsumableSlot(consumables, consumableCapacity),
      jokerSlotsFull: effectiveJokerCount(jokers) >= jokerCapacity,
      previewHand: packPreviewHand,
      previewSelectedIds: packPreviewSelectedIds,
      onSelectPreviewCard,
      onReorderPreview,
      onPick: pickFromOpenedPack,
      onClose: closeOpenedPack,
    };
  }, [
    openedPack,
    packPicksRemaining,
    pickedPackOptionIndices,
    consumables,
    consumableCapacity,
    jokers,
    jokerCapacity,
    packPreviewHand,
    packPreviewSelectedIds,
    onSelectPreviewCard,
    onReorderPreview,
    pickFromOpenedPack,
    closeOpenedPack,
  ]);
}
