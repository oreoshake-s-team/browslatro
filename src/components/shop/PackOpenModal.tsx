import "./PackOpenModal.css";
import { createPortal } from "react-dom";
import {
  type PackOffer,
  packDisplayName,
  packPickLimit,
} from "../../items/packs";
import { useEscapeToClose } from "../system/useEscapeToClose";

interface PackOpenModalProps {
  pack: PackOffer;
  picksRemaining: number;
  consumableSlotsFree: number;
  onPick: (optionIdx: number) => void;
  onClose: () => void;
}

export default function PackOpenModal({
  pack,
  picksRemaining,
  consumableSlotsFree,
  onPick,
  onClose,
}: PackOpenModalProps) {
  useEscapeToClose(onClose, true);
  const totalPicks = packPickLimit(pack.variant);
  const title = packDisplayName(pack);
  const subtitle =
    totalPicks === 1
      ? "Pick 1 card to keep"
      : `Pick ${totalPicks} cards to keep (${picksRemaining} left)`;
  const closeLabel = picksRemaining < totalPicks ? "Done" : "Skip";

  return createPortal(
    <div
      className="pack-open-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pack-open-title"
    >
      <div className="pack-open-modal" onClick={(e) => e.stopPropagation()}>
        <h2 id="pack-open-title" className="pack-open-title">
          🎁 {title}
        </h2>
        <p className="pack-open-subtitle" data-testid="pack-open-subtitle">
          {subtitle}
        </p>
        <ul className="pack-open-options" aria-label="Pack options">
          {pack.options.map((option, idx) => {
            if (option.kind !== "planet") return null;
            const noRoom = consumableSlotsFree <= 0;
            const disabled = noRoom || picksRemaining <= 0;
            const tooltip = noRoom
              ? "Consumable slots are full"
              : picksRemaining <= 0
                ? "No picks remaining"
                : undefined;
            return (
              <li key={`${option.planet.id}-${idx}`} className="pack-open-option">
                <span className="pack-open-option-icon" aria-hidden="true">🪐</span>
                <span className="pack-open-option-name">{option.planet.name}</span>
                <span className="pack-open-option-description">
                  {option.planet.description}
                </span>
                <button
                  type="button"
                  className="pack-open-option-pick"
                  data-testid={`pack-open-pick-${idx}`}
                  disabled={disabled}
                  title={tooltip}
                  aria-label={`Pick ${option.planet.name}`}
                  onClick={() => onPick(idx)}
                >
                  Pick
                </button>
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          className="pack-open-close"
          data-testid="pack-open-close"
          onClick={onClose}
        >
          {closeLabel}
        </button>
      </div>
    </div>,
    document.body,
  );
}
