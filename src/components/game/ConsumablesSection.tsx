import { useTranslation } from "react-i18next";
import Consumables from "../consumables/Consumables";
import { useGame } from "../../store/game";
import { consumableCapacityFor } from "../../items/capacities";
import { useDragController } from "../../hooks/useDragController";
import { useConsumableActions } from "../../hooks/useConsumableActions";
import { foolCopyTargetText } from "../../i18n/foolCopyTarget";
import { play } from "../system/sounds";

export default function ConsumablesSection() {
  const { t, i18n } = useTranslation();
  const consumables = useGame((s) => s.consumables);
  const lastUsedConsumable = useGame((s) => s.lastUsedConsumable);
  const selectedIds = useGame((s) => s.selectedIds);
  const openedPack = useGame((s) => s.openedPack);
  const packPreviewHand = useGame((s) => s.packPreviewHand);
  const packPreviewSelectedIds = useGame((s) => s.packPreviewSelectedIds);
  const ownedVoucherIds = useGame((s) => s.ownedVoucherIds);
  const sellConsumableAction = useGame((s) => s.sellConsumable);
  const sellJokerAction = useGame((s) => s.sellJoker);

  const { useConsumable } = useConsumableActions();

  function sellConsumable(consumableIdx: number): void {
    play("pop");
    sellConsumableAction(consumableIdx);
  }

  const dragController = useDragController({
    useConsumable,
    sellConsumable,
    sellJoker: (jokerIdx: number) => {
      play("pop");
      sellJokerAction(jokerIdx);
    },
  });

  const previewActive = openedPack !== null && packPreviewHand.length > 0;

  return (
    <Consumables
      consumables={consumables}
      foolCopyTarget={foolCopyTargetText(t, i18n.language, lastUsedConsumable)}
      selectedCount={
        previewActive ? packPreviewSelectedIds.size : selectedIds.size
      }
      previewMode={previewActive}
      capacity={consumableCapacityFor(ownedVoucherIds)}
      onUse={useConsumable}
      onSell={sellConsumable}
      onDragStart={dragController.onConsumableDragStart}
      onDragEnd={dragController.onConsumableDragEnd}
    />
  );
}
