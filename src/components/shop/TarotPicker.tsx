import { useId, useState } from "react";
import { createPortal } from "react-dom";
import "./TarotPicker.css";
import type { Card } from "../../types";
import type { TarotCard } from "../../tarots";
import { useEscapeToClose } from "../system/useEscapeToClose";

interface TarotPickerProps {
  tarot: TarotCard;
  hand: ReadonlyArray<Card>;
  onConfirm: (cardIds: ReadonlyArray<number>) => void;
  onCancel: () => void;
}

export default function TarotPicker({
  tarot,
  hand,
  onConfirm,
  onCancel,
}: TarotPickerProps) {
  const titleId = useId();
  useEscapeToClose(onCancel, true);
  const [picked, setPicked] = useState<ReadonlyArray<number>>([]);
  const effect = tarot.effect;
  if (effect.kind !== "apply-enhancement") return null;
  const { maxTargets, enhancement } = effect;
  const togglePick = (id: number): void =>
    setPicked((prev) =>
      prev.includes(id)
        ? prev.filter((p) => p !== id)
        : prev.length >= maxTargets ? prev : [...prev, id],
    );
  const instructions = picked.length === 0
    ? `Pick a card from your hand to enhance with ${enhancement}`
    : `Picked ${picked.length} card${picked.length === 1 ? "" : "s"}; Confirm to apply ${enhancement}`;
  return createPortal(
    <div
      className="tarot-picker-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onCancel}
    >
      <div className="tarot-picker-modal" onClick={(e) => e.stopPropagation()}>
        <h2 id={titleId} className="tarot-picker-title">{tarot.name}</h2>
        <p className="tarot-picker-instructions">{instructions}</p>
        <ul className="tarot-picker-cards" aria-label="Pick cards to enhance">
          {hand.map((card) => {
            const isPicked = picked.includes(card.id);
            return (
              <li key={card.id}>
                <button
                  type="button"
                  className={`tarot-picker-card${isPicked ? " tarot-picker-card-picked" : ""}`}
                  aria-pressed={isPicked}
                  aria-label={`${card.rank} of ${card.suit}`}
                  onClick={() => togglePick(card.id)}
                >
                  {card.rank} {card.suit[0].toUpperCase()}
                </button>
              </li>
            );
          })}
        </ul>
        <div className="tarot-picker-actions">
          <button type="button" className="tarot-picker-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="tarot-picker-confirm"
            disabled={picked.length === 0}
            onClick={() => onConfirm(picked)}
            autoFocus
          >
            Confirm
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
