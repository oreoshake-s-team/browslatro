import "./ModifierPlanetPicker.css";
import { useMemo } from "react";
import { useEscapeToClose } from "../system/useEscapeToClose";
import { useAnchoredTooltip } from "../system/useAnchoredTooltip";
import { consumableCapacityFor } from "../../items/capacities";
import { useGame } from "../../store/game";
import { play } from "../system/sounds";
import {
  addConsumable,
} from "../../items/consumables";
import { createPlanetCatalog } from "../../items/planets";
import { sortByDisplayName } from "./displayNameSort";
import PlanetTooltip from "./PlanetTooltip";

export default function ModifierPlanetPicker() {
  const consumables = useGame((s) => s.consumables);
  const setConsumables = useGame((s) => s.setConsumables);
  const ownedVoucherIds = useGame((s) => s.ownedVoucherIds);
  const planets = useMemo(
    () => sortByDisplayName(createPlanetCatalog(), (c) => c.name),
    [],
  );
  const capacity =
    consumableCapacityFor(ownedVoucherIds);
  const isFull = consumables.length >= capacity;

  const tooltip = useAnchoredTooltip<string>();
  useEscapeToClose(tooltip.closeAll, tooltip.openId !== null);

  const openTooltip = tooltip.open;
  const closeTooltip = tooltip.close;

  function addPlanet(id: string) {
    const card = planets.find((p) => p.id === id);
    if (!card) return;
    if (isFull) return;
    play("pop");
    setConsumables((prev) =>
      addConsumable(prev, { kind: "planet", card }, capacity),
    );
  }

  return (
    <details className="modifier-planet-picker">
      <summary className="modifier-planet-picker-summary">
        Add a specific Planet
      </summary>
      <div className="modifier-planet-picker-grid">
        {planets.map((card) => {
           const tooltipId = tooltip.describedBy(card.id);
           const open = tooltip.isOpen(card.id);
          return (
            <button
              key={card.id}
              type="button"
              className="add-planet-button"
              data-planet-id={card.id}
              disabled={isFull}
              aria-disabled={isFull}
               aria-describedby={tooltipId}
              onMouseEnter={(e) => openTooltip(card.id, e.currentTarget)}
              onMouseLeave={() => closeTooltip(card.id)}
              onFocus={(e) => openTooltip(card.id, e.currentTarget)}
              onBlur={() => closeTooltip(card.id)}
              onClick={() => addPlanet(card.id)}
            >
              <span aria-hidden="true">🌌 </span>
              {card.name}
               {open && tooltip.anchorRect && (
                <PlanetTooltip
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
