import "./ModifierSpectralPicker.css";
import { useEffect, useId, useMemo, useState } from "react";
import { useGame } from "../../store/game";
import { play } from "../system/sounds";
import {
  MAX_CONSUMABLE_SLOTS,
  addConsumable,
} from "../../items/consumables";
import { extraConsumableSlots } from "../../items/vouchers";
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
          const tooltipId = `${tooltipIdBase}-${card.id}`;
          const open = tooltip?.id === card.id;
          return (
            <button
              key={card.id}
              type="button"
              className="add-spectral-button"
              data-spectral-id={card.id}
              disabled={isFull}
              aria-disabled={isFull}
              aria-describedby={open ? tooltipId : undefined}
              onMouseEnter={(e) => openTooltip(card.id, e.currentTarget)}
              onMouseLeave={() => closeTooltip(card.id)}
              onFocus={(e) => openTooltip(card.id, e.currentTarget)}
              onBlur={() => closeTooltip(card.id)}
              onClick={() => addSpectral(card.id)}
            >
              👻 {card.name}
              {open && tooltip && (
                <SpectralTooltip
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
