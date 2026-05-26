import { useCallback, useState } from "react";
import { createPortal } from "react-dom";
import "./DeckPile.css";
import Card from "./Card";
import type { Card as CardType, Suit } from "../../types";
import { SUITS, groupBySuit } from "../../deck";
import { useEscapeToClose } from "../system/useEscapeToClose";
import { useConsumableDropZone } from "../consumables/useConsumableDropZone";

const SUIT_LABELS: Record<Suit, string> = {
  spades: "Spades",
  hearts: "Hearts",
  diamonds: "Diamonds",
  clubs: "Clubs",
};

interface DeckPileProps {
  remaining: ReadonlyArray<CardType>;
  consumableDropEnabled?: boolean;
  onConsumableDrop?: () => void;
}

export default function DeckPile({
  remaining,
  consumableDropEnabled = false,
  onConsumableDrop,
}: DeckPileProps) {
  const [open, setOpen] = useState(false);
  const grouped = groupBySuit(remaining);
  const handleClose = useCallback(() => setOpen(false), []);
  useEscapeToClose(handleClose, open);
  const dropZone = useConsumableDropZone({
    enabled: consumableDropEnabled,
    onDrop: onConsumableDrop,
  });
  const showDropZone = Boolean(dropZone.onDrop);

  return (
    <>
      <button
        type="button"
        className={`deck-pile${showDropZone ? " deck-pile-drop-target" : ""}${
          dropZone.hover ? " deck-pile-drop-hover" : ""
        }`}
        aria-label={`Deck (${remaining.length} cards remaining)`}
        data-consumable-drop-active={showDropZone || undefined}
        onClick={() => setOpen(true)}
        onDragOver={dropZone.onDragOver}
        onDragLeave={dropZone.onDragLeave}
        onDrop={dropZone.onDrop}
      >
        <span className="deck-pile-count">{remaining.length}</span>
        {showDropZone && (
          <span
            className="consumable-drop-overlay consumable-drop-overlay-sell"
            data-testid="consumable-drop-overlay-sell"
            aria-hidden="true"
          >
            <span className="consumable-drop-overlay-label">Sell</span>
          </span>
        )}
      </button>
      {open &&
        createPortal(
          <div className="modal-overlay" onClick={handleClose}>
            <div
              className="modal deck-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <h3>Remaining Cards</h3>
              <div className="deck-modal-groups">
                {SUITS.map((suit) => (
                  <section key={suit} className="deck-modal-group">
                    <h4>
                      {SUIT_LABELS[suit]} ({grouped[suit].length})
                    </h4>
                    <div className="deck-modal-cards">
                      {grouped[suit].map((card) => (
                        <Card key={card.id} card={card} />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
              <button className="modal-close" onClick={handleClose}>
                Close
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
