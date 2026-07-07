import "./ModifierTarotPicker.css";
import { useEffect, useId, useMemo, useState } from "react";
import { useEscapeToClose } from "../system/useEscapeToClose";
import { useGame } from "../../store/game";
import { play } from "../system/sounds";
import {
  MAX_CONSUMABLE_SLOTS,
  addConsumable,
} from "../../items/consumables";
import { extraConsumableSlots } from "../../items/vouchers";
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
    MAX_CONSUMABLE_SLOTS + extraConsumableSlots(ownedVoucherIds);
  const isFull = consumables.length >= capacity;

  const tooltipIdBase = useId();
  const [tooltip, setTooltip] = useState<{
    readonly id: string;
    readonly rect: DOMRect;
  } | null>(null);

  useEscapeToClose(() => setTooltip(null), tooltip !== null);

  function openTooltip(id: string, el: HTMLElement) {
    setTooltip({ id, rect: el.getBoundingClientRect() });
  }

  function closeTooltip(id: string) {
    setTooltip((prev) => (prev?.id === id ? null : prev));
  }

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
          const tooltipId = `${tooltipIdBase}-${card.id}`;
          const open = tooltip?.id === card.id;
          return (
            <button
              key={card.id}
              type="button"
              className="add-tarot-button"
              data-tarot-id={card.id}
              disabled={isFull}
              aria-disabled={isFull}
              aria-describedby={open ? tooltipId : undefined}
              onMouseEnter={(e) => openTooltip(card.id, e.currentTarget)}
              onMouseLeave={() => closeTooltip(card.id)}
              onFocus={(e) => openTooltip(card.id, e.currentTarget)}
              onBlur={() => closeTooltip(card.id)}
              onClick={() => addTarot(card.id)}
            >
              <span aria-hidden="true">🔮 </span>
              {card.name}
              {open && tooltip && (
                <TarotTooltip
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
