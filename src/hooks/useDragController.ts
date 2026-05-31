import { useGame } from "../store/game";
import { consumableUseBlock } from "../items/consumables";

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
}

export function useDragController({
  useConsumable,
  sellConsumable,
  sellJoker,
}: UseDragControllerParams): DragController {
  const consumables = useGame((s) => s.consumables);
  const selectedIds = useGame((s) => s.selectedIds);
  const draggingConsumableIndex = useGame((s) => s.draggingConsumableIndex);
  const setDraggingConsumableIndex = useGame(
    (s) => s.setDraggingConsumableIndex,
  );
  const draggingJokerIndex = useGame((s) => s.draggingJokerIndex);
  const setDraggingJokerIndex = useGame((s) => s.setDraggingJokerIndex);

  const draggingConsumable =
    draggingConsumableIndex !== null
      ? consumables[draggingConsumableIndex] ?? null
      : null;
  const canDropDraggedConsumableOnJokers =
    draggingConsumable !== null &&
    consumableUseBlock(draggingConsumable, selectedIds.size) === null;

  function consumableDrop(action: (idx: number) => void): () => void {
    return () => {
      if (draggingConsumableIndex === null) return;
      const idx = draggingConsumableIndex;
      setDraggingConsumableIndex(null);
      action(idx);
    };
  }

  return {
    draggingConsumableIndex,
    draggingJokerIndex,
    canDropDraggedConsumableOnJokers,
    onConsumableDragStart: setDraggingConsumableIndex,
    onConsumableDragEnd: () => setDraggingConsumableIndex(null),
    onConsumableDropOnJokers: consumableDrop(useConsumable),
    onConsumableDropOnDeck: consumableDrop(sellConsumable),
    onJokerDragStart: setDraggingJokerIndex,
    onJokerDragEnd: () => setDraggingJokerIndex(null),
    onJokerDropOnDeck: () => {
      if (draggingJokerIndex === null) return;
      const idx = draggingJokerIndex;
      setDraggingJokerIndex(null);
      sellJoker(idx);
    },
  };
}
