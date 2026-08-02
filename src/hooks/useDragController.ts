import { useCallback } from "react";
import { useGame } from "../store/game";
import { consumableUseBlock, type Consumable } from "../items/consumables";

const EMPTY_CONSUMABLES: ReadonlyArray<Consumable> = [];
const EMPTY_SELECTED_IDS: ReadonlySet<number> = new Set();

export interface DragController {
  readonly draggingConsumableIndex: number | null;
  readonly draggingJokerIndex: number | null;
  readonly canDropDraggedConsumableOnJokers: boolean;
  readonly onConsumableDragStart: (index: number) => void;
  readonly onConsumableDragEnd: () => void;
  readonly onConsumableDropOnJokers: () => void;
  readonly onConsumableDropOnDeck: () => void;
  readonly onJokerDragStart: (index: number) => void;
  readonly onJokerDragEnd: () => void;
  readonly onJokerDropOnDeck: () => void;
}

export interface UseDragControllerParams {
  readonly useConsumable: (index: number) => void;
  readonly sellConsumable: (index: number) => void;
  readonly sellJoker: (index: number) => void;
  /** Whether the caller reads `draggingConsumableIndex` (e.g. to flag a drop zone). Defaults to true. */
  readonly needsConsumableDragIndex?: boolean;
  /** Whether the caller reads `draggingJokerIndex` (e.g. to flag a drop zone). Defaults to true. */
  readonly needsJokerDragIndex?: boolean;
  /** Whether the caller reads `canDropDraggedConsumableOnJokers` (only JokersSection). Defaults to true. */
  readonly needsConsumableDropZone?: boolean;
}

export function useDragController({
  useConsumable: onUseConsumable,
  sellConsumable,
  sellJoker,
  needsConsumableDragIndex = true,
  needsJokerDragIndex = true,
  needsConsumableDropZone = true,
}: UseDragControllerParams): DragController {
  const consumables = useGame((s) =>
    needsConsumableDropZone ? s.consumables : EMPTY_CONSUMABLES,
  );
  const selectedIds = useGame((s) =>
    needsConsumableDropZone ? s.selectedIds : EMPTY_SELECTED_IDS,
  );
  const draggingConsumableIndex = useGame((s) =>
    needsConsumableDragIndex || needsConsumableDropZone
      ? s.draggingConsumableIndex
      : null,
  );
  const setDraggingConsumableIndex = useGame(
    (s) => s.setDraggingConsumableIndex,
  );
  const draggingJokerIndex = useGame((s) =>
    needsJokerDragIndex ? s.draggingJokerIndex : null,
  );
  const setDraggingJokerIndex = useGame((s) => s.setDraggingJokerIndex);

  const draggingConsumable =
    needsConsumableDropZone && draggingConsumableIndex !== null
      ? consumables[draggingConsumableIndex] ?? null
      : null;
  const canDropDraggedConsumableOnJokers =
    draggingConsumable !== null &&
    consumableUseBlock(draggingConsumable, selectedIds.size) === null;

  const onConsumableDragEnd = useCallback(
    () => setDraggingConsumableIndex(null),
    [setDraggingConsumableIndex],
  );
  const onJokerDragEnd = useCallback(
    () => setDraggingJokerIndex(null),
    [setDraggingJokerIndex],
  );
  const onConsumableDropOnJokers = useCallback(() => {
    const idx = useGame.getState().draggingConsumableIndex;
    if (idx === null) return;
    setDraggingConsumableIndex(null);
    onUseConsumable(idx);
  }, [setDraggingConsumableIndex, onUseConsumable]);
  const onConsumableDropOnDeck = useCallback(() => {
    const idx = useGame.getState().draggingConsumableIndex;
    if (idx === null) return;
    setDraggingConsumableIndex(null);
    sellConsumable(idx);
  }, [setDraggingConsumableIndex, sellConsumable]);
  const onJokerDropOnDeck = useCallback(() => {
    const idx = useGame.getState().draggingJokerIndex;
    if (idx === null) return;
    setDraggingJokerIndex(null);
    sellJoker(idx);
  }, [setDraggingJokerIndex, sellJoker]);

  return {
    draggingConsumableIndex,
    draggingJokerIndex,
    canDropDraggedConsumableOnJokers,
    onConsumableDragStart: setDraggingConsumableIndex,
    onConsumableDragEnd,
    onConsumableDropOnJokers,
    onConsumableDropOnDeck,
    onJokerDragStart: setDraggingJokerIndex,
    onJokerDragEnd,
    onJokerDropOnDeck,
  };
}
