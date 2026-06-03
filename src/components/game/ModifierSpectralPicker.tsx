import "./ModifierSpectralPicker.css";
import { useMemo } from "react";
import { useGame } from "../../store/game";
import { play } from "../system/sounds";
import {
  MAX_CONSUMABLE_SLOTS,
  addConsumable,
} from "../../items/consumables";
import { extraConsumableSlots } from "../../items/vouchers";
import { createSpectralCatalog } from "../../items/spectrals";

export default function ModifierSpectralPicker() {
  const consumables = useGame((s) => s.consumables);
  const setConsumables = useGame((s) => s.setConsumables);
  const ownedVoucherIds = useGame((s) => s.ownedVoucherIds);
  const spectrals = useMemo(() => createSpectralCatalog(), []);
  const capacity =
    MAX_CONSUMABLE_SLOTS + extraConsumableSlots(ownedVoucherIds);
  const isFull = consumables.length >= capacity;

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
        {spectrals.map((card) => (
          <button
            key={card.id}
            type="button"
            className="add-spectral-button"
            data-spectral-id={card.id}
            title={card.description}
            disabled={isFull}
            aria-disabled={isFull}
            onClick={() => addSpectral(card.id)}
          >
            👻 {card.name}
          </button>
        ))}
      </div>
    </details>
  );
}
