import { useMemo } from "react";
import { useEscapeToClose } from "../system/useEscapeToClose";
import { useAnchoredTooltip } from "../system/useAnchoredTooltip";
import { consumableCapacityFor } from "../../items/capacities";
import { useGame } from "../../store/game";
import { play } from "../system/sounds";
import { addConsumable } from "../../items/consumables";
import { createTarotCatalog } from "../../items/tarots";
import { sortByDisplayName } from "./displayNameSort";
import TarotTooltip from "./TarotTooltip";

const TILE_CLASS =
  "inline-flex cursor-pointer items-center gap-1 rounded-md border border-solid border-money/40 bg-money/10 px-2 py-1 text-left text-xs font-semibold text-money transition-colors enabled:hover:bg-money/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-45";

export default function ModifierTarotPicker() {
  const consumables = useGame((s) => s.consumables);
  const setConsumables = useGame((s) => s.setConsumables);
  const ownedVoucherIds = useGame((s) => s.ownedVoucherIds);
  const tarots = useMemo(
    () => sortByDisplayName(createTarotCatalog(), (c) => c.name),
    [],
  );
  const capacity = consumableCapacityFor(ownedVoucherIds);
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
    <details
      data-testid="modifier-tarot-picker"
      className="w-full rounded-lg border border-dashed border-muted/40 bg-white/5 px-3 pb-3 pt-2"
    >
      <summary className="cursor-pointer select-none py-1 text-xs font-bold uppercase tracking-wider text-muted hover:text-money">
        Add a specific Tarot
      </summary>
      <div className="mt-2 grid grid-cols-7 gap-1">
        {tarots.map((card) => {
          const tooltipId = tooltip.describedBy(card.id);
          const open = tooltip.isOpen(card.id);
          return (
            <button
              key={card.id}
              type="button"
              className={TILE_CLASS}
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
