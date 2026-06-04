import "./ModifierPlanetPicker.css";
import { useEffect, useId, useMemo, useState } from "react";
import { useGame } from "../../store/game";
import { play } from "../system/sounds";
import {
  MAX_CONSUMABLE_SLOTS,
  addConsumable,
} from "../../items/consumables";
import { extraConsumableSlots } from "../../items/vouchers";
import { createPlanetCatalog } from "../../items/planets";
import PlanetTooltip from "./PlanetTooltip";

export default function ModifierPlanetPicker() {
  const consumables = useGame((s) => s.consumables);
  const setConsumables = useGame((s) => s.setConsumables);
  const ownedVoucherIds = useGame((s) => s.ownedVoucherIds);
  const planets = useMemo(() => createPlanetCatalog(), []);
  const capacity =
    MAX_CONSUMABLE_SLOTS + extraConsumableSlots(ownedVoucherIds);
  const isFull = consumables.length >= capacity;

  const tooltipIdBase = useId();
  const [tooltip, setTooltip] = useState<{
    readonly id: string;
    readonly rect: DOMRect;
  } | null>(null);

  useEffect(() => {
    if (tooltip === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setTooltip(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tooltip]);

  function openTooltip(id: string, el: HTMLElement) {
    setTooltip({ id, rect: el.getBoundingClientRect() });
  }

  function closeTooltip(id: string) {
    setTooltip((prev) => (prev?.id === id ? null : prev));
  }

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
          const tooltipId = `${tooltipIdBase}-${card.id}`;
          const open = tooltip?.id === card.id;
          return (
            <button
              key={card.id}
              type="button"
              className="add-planet-button"
              data-planet-id={card.id}
              disabled={isFull}
              aria-disabled={isFull}
              aria-describedby={open ? tooltipId : undefined}
              onMouseEnter={(e) => openTooltip(card.id, e.currentTarget)}
              onMouseLeave={() => closeTooltip(card.id)}
              onFocus={(e) => openTooltip(card.id, e.currentTarget)}
              onBlur={() => closeTooltip(card.id)}
              onClick={() => addPlanet(card.id)}
            >
              🌌 {card.name}
              {open && tooltip && (
                <PlanetTooltip
                  id={tooltipId}
                  card={card}
                  anchorRect={tooltip.rect}
                />
              )}
            </button>
          );
        })}
      </div>
    </details>
  );
}
