import "./ModifierSpectralPicker.css";
import { useMemo } from "react";
import { useEscapeToClose } from "../system/useEscapeToClose";
import { useAnchoredTooltip } from "../system/useAnchoredTooltip";
import { consumableCapacityFor } from "../../items/capacities";
import { useGame } from "../../store/game";
import { play } from "../system/sounds";
import {
  addConsumable,
} from "../../items/consumables";
import { createSpectralCatalog } from "../../items/spectrals";
import { sortByDisplayName } from "./displayNameSort";
import SpectralTooltip from "./SpectralTooltip";

export default function ModifierSpectralPicker() {
  const consumables = useGame((s) => s.consumables);
  const setConsumables = useGame((s) => s.setConsumables);
  const ownedVoucherIds = useGame((s) => s.ownedVoucherIds);
  const spectrals = useMemo(
    () => sortByDisplayName(createSpectralCatalog(), (c) => c.name),
    [],
  );
  const capacity =
    consumableCapacityFor(ownedVoucherIds);
  const isFull = consumables.length >= capacity;

  const tooltip = useAnchoredTooltip<string>();
  useEscapeToClose(tooltip.closeAll, tooltip.openId !== null);

  const openTooltip = tooltip.open;
  const closeTooltip = tooltip.close;

  function addSpectral(id: string) {
    const card = spectrals.find((s) => s.id === id);
    if (!card) return;
    if (isFull) return;
    play("pop");
    setConsumables((prev) =>
      addConsumable(prev, { kind: "spectral", card }, capacity),
    );
  }

  return (
    <details className="modifier-spectral-picker">
      <summary className="modifier-spectral-picker-summary">
        Add a specific Spectral
      </summary>
      <div className="modifier-spectral-picker-grid">
        {spectrals.map((card) => {
           const tooltipId = tooltip.describedBy(card.id);
           const open = tooltip.isOpen(card.id);
          return (
            <button
              key={card.id}
              type="button"
              className="add-spectral-button"
              data-spectral-id={card.id}
              disabled={isFull}
              aria-disabled={isFull}
               aria-describedby={tooltipId}
              onMouseEnter={(e) => openTooltip(card.id, e.currentTarget)}
              onMouseLeave={() => closeTooltip(card.id)}
              onFocus={(e) => openTooltip(card.id, e.currentTarget)}
              onBlur={() => closeTooltip(card.id)}
              onClick={() => addSpectral(card.id)}
            >
              <span aria-hidden="true">👻 </span>
              {card.name}
               {open && tooltip.anchorRect && (
                <SpectralTooltip
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
