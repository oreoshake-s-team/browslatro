import "./ModifierTarotPicker.css";
import { useMemo } from "react";
import { useEscapeToClose } from "../system/useEscapeToClose";
import { useAnchoredTooltip } from "../system/useAnchoredTooltip";
import { consumableCapacityFor } from "../../items/capacities";
import { useGame } from "../../store/game";
import { play } from "../system/sounds";
import {
  addConsumable,
} from "../../items/consumables";
import { createTarotCatalog } from "../../items/tarots";
import { sortByDisplayName } from "./displayNameSort";
import TarotTooltip from "./TarotTooltip";

export default function ModifierTarotPicker() {
  const consumables = useGame((s) => s.consumables);
  const setConsumables = useGame((s) => s.setConsumables);
  const ownedVoucherIds = useGame((s) => s.ownedVoucherIds);
  const tarots = useMemo(
    () => sortByDisplayName(createTarotCatalog(), (c) => c.name),
    [],
  );
  const capacity =
    consumableCapacityFor(ownedVoucherIds);
  const isFull = consumables.length >= capacity;

  const tooltip = useAnchoredTooltip<string>();
  useEscapeToClose(tooltip.closeAll, tooltip.openId !== null);

  const openTooltip = tooltip.open;
  const closeTooltip = tooltip.close;

  function addTarot(id: string) {
    const card = tarots.find((t) => t.id === id);
    if (!card) return;
    if (isFull) return;
    play("pop");
    setConsumables((prev) =>
      addConsumable(prev, { kind: "tarot", card }, capacity),
    );
  }

  return (
    <details className="modifier-tarot-picker">
      <summary className="modifier-tarot-picker-summary">
        Add a specific Tarot
      </summary>
      <div className="modifier-tarot-picker-grid">
        {tarots.map((card) => {
           const tooltipId = tooltip.describedBy(card.id);
           const open = tooltip.isOpen(card.id);
          return (
            <button
              key={card.id}
              type="button"
              className="add-tarot-button"
              data-tarot-id={card.id}
              disabled={isFull}
              aria-disabled={isFull}
               aria-describedby={tooltipId}
              onMouseEnter={(e) => openTooltip(card.id, e.currentTarget)}
              onMouseLeave={() => closeTooltip(card.id)}
              onFocus={(e) => openTooltip(card.id, e.currentTarget)}
              onBlur={() => closeTooltip(card.id)}
              onClick={() => addTarot(card.id)}
            >
              <span aria-hidden="true">🔮 </span>
              {card.name}
               {open && tooltip.anchorRect && (
                <TarotTooltip
                   id={tooltipId!}
                  card={card}
                   anchorRect={tooltip.anchorRect}
                />
              )}
            </button>
          );
        })}
      </div>
    </details>
  );
}
