import "./PackOpenModal.css";
import { createPortal } from "react-dom";
import {
  type PackOffer,
  type PackOption,
  packDisplayName,
  packPickLimit,
} from "../../items/packs";
import { useEscapeToClose } from "../system/useEscapeToClose";

interface PackOpenModalProps {
  pack: PackOffer;
  picksRemaining: number;
  consumableSlotsFull?: boolean;
  jokerSlotsFull?: boolean;
  onPick: (optionIdx: number) => void;
  onClose: () => void;
}

interface OptionView {
  readonly id: string;
  readonly icon: string;
  readonly name: string;
  readonly description: string;
  readonly needsConsumableSlot: boolean;
  readonly needsJokerSlot: boolean;
}

function describeOption(option: PackOption): OptionView | null {
  if (option.kind === "planet") {
    return {
      id: option.planet.id,
      icon: "🪐",
      name: option.planet.name,
      description: option.planet.description,
      needsConsumableSlot: false,
      needsJokerSlot: false,
    };
  }
  if (option.kind === "tarot") {
    return {
      id: option.tarot.id,
      icon: "🃏",
      name: option.tarot.name,
      description: option.tarot.description,
      needsConsumableSlot: true,
      needsJokerSlot: false,
    };
  }
  if (option.kind === "joker") {
    return {
      id: option.joker.id,
      icon: "🎭",
      name: option.joker.name,
      description: option.joker.description,
      needsConsumableSlot: false,
      needsJokerSlot: true,
    };
  }
  return null;
}

export default function PackOpenModal({
  pack,
  picksRemaining,
  consumableSlotsFull = false,
  jokerSlotsFull = false,
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
            const view = describeOption(option);
            if (!view) return null;
            const noPicksLeft = picksRemaining <= 0;
            const consumableBlocked = view.needsConsumableSlot && consumableSlotsFull;
            const jokerBlocked = view.needsJokerSlot && jokerSlotsFull;
            const disabled = noPicksLeft || consumableBlocked || jokerBlocked;
            const tooltip = noPicksLeft
              ? "No picks remaining"
              : consumableBlocked
                ? "Consumable slots are full"
                : jokerBlocked
                  ? "Joker slots are full"
                  : undefined;
            return (
              <li key={`${view.id}-${idx}`} className="pack-open-option">
                <span className="pack-open-option-icon" aria-hidden="true">{view.icon}</span>
                <span className="pack-open-option-name">{view.name}</span>
                <span className="pack-open-option-description">
                  {view.description}
                </span>
                <button
                  type="button"
                  className="pack-open-option-pick"
                  data-testid={`pack-open-pick-${idx}`}
                  disabled={disabled}
                  title={tooltip}
                  aria-label={`Pick ${view.name}`}
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
