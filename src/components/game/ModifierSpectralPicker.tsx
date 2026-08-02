import { useMemo } from "react";
import { useEscapeToClose } from "../system/useEscapeToClose";
import { useAnchoredTooltip } from "../system/useAnchoredTooltip";
import { consumableCapacityFor } from "../../items/capacities";
import { useGame } from "../../store/game";
import { play } from "../system/sounds";
import { addConsumable } from "../../items/consumables";
import { createSpectralCatalog } from "../../items/spectrals";
import { sortByDisplayName } from "./displayNameSort";
import SpectralTooltip from "./SpectralTooltip";

const TILE_CLASS =
  "inline-flex cursor-pointer items-center gap-1 rounded-md border border-solid border-advisor/40 bg-advisor/10 px-2 py-1 text-left text-xs font-semibold text-advisor transition-colors enabled:hover:bg-advisor/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-45";

export default function ModifierSpectralPicker() {
  const consumables = useGame((s) => s.consumables);
  const setConsumables = useGame((s) => s.setConsumables);
  const ownedVoucherIds = useGame((s) => s.ownedVoucherIds);
  const spectrals = useMemo(
    () => sortByDisplayName(createSpectralCatalog(), (c) => c.name),
    [],
  );
  const selectedDeck = useGame((s) => s.selectedDeck);
  const capacity = consumableCapacityFor(ownedVoucherIds, selectedDeck);
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
    <details
      data-testid="modifier-spectral-picker"
      className="w-full rounded-lg border border-dashed border-muted/40 bg-white/5 px-3 pb-3 pt-2"
    >
      <summary className="cursor-pointer select-none py-1 text-xs font-bold uppercase tracking-wider text-muted hover:text-advisor">
        Add a specific Spectral
      </summary>
      <div className="mt-2 grid grid-cols-6 gap-1">
        {spectrals.map((card) => {
          const tooltipId = tooltip.describedBy(card.id);
          const open = tooltip.isOpen(card.id);
          return (
            <button
              key={card.id}
              type="button"
              className={TILE_CLASS}
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
