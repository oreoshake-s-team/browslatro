import Jokers from "../jokers/Jokers";
import { useGame } from "../../store/game";
import { jokerCapacityFor } from "../../items/capacities";
import { useDragController } from "../../hooks/useDragController";
import { useConsumableActions } from "../../hooks/useConsumableActions";
import { play } from "../system/sounds";
import { bossHidesJokers } from "../../items/bosses";

export default function JokersSection() {
  const jokers = useGame((s) => s.jokers);
  const jokerPulseCounters = useGame((s) => s.jokerPulseCounters);
  const reorderJokers = useGame((s) => s.reorderJokers);
  const blind = useGame((s) => s.blind);
  const currentBoss = useGame((s) => s.currentBoss);
  const ownedVoucherIds = useGame((s) => s.ownedVoucherIds);
  const selectedDeck = useGame((s) => s.selectedDeck);
  const openedPack = useGame((s) => s.openedPack);
  const sellConsumableAction = useGame((s) => s.sellConsumable);
  const sellJokerAction = useGame((s) => s.sellJoker);

  const { useConsumable } = useConsumableActions();

  function sellJoker(jokerIdx: number): void {
    play("pop");
    sellJokerAction(jokerIdx);
  }

  const dragController = useDragController({
    useConsumable,
    sellConsumable: (consumableIdx: number) => {
      play("pop");
      sellConsumableAction(consumableIdx);
    },
    sellJoker,
  });

  const dragging = dragController.draggingConsumableIndex !== null;
  const packOffersJoker =
    openedPack?.options.some((option) => option.kind === "joker") ?? false;

  return (
    <Jokers
      jokers={jokers}
      capacity={jokerCapacityFor(ownedVoucherIds, selectedDeck)}
      faceDown={blind === 3 && bossHidesJokers(currentBoss)}
      pulseCounters={jokerPulseCounters}
      onReorder={reorderJokers}
      onSell={sellJoker}
      sellAlwaysVisible={packOffersJoker}
      onDragStart={dragController.onJokerDragStart}
      onDragEnd={dragController.onJokerDragEnd}
      consumableDropEnabled={
        dragging && dragController.canDropDraggedConsumableOnJokers
      }
      onConsumableDrop={dragController.onConsumableDropOnJokers}
    />
  );
}
