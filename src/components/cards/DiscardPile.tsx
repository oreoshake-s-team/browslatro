import { useCallback, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./DiscardPile.css";
import Card from "./Card";
import type { Card as CardType, Suit } from "../../cards/types";
import { SUITS, groupBySuit } from "../../cards/deck";
import { useEscapeToClose } from "../system/useEscapeToClose";
import { useFocusTrap } from "../system/useFocusTrap";

const SUIT_LABELS: Record<Suit, string> = {
  spades: "Spades",
  hearts: "Hearts",
  diamonds: "Diamonds",
  clubs: "Clubs",
};

interface DiscardPileProps {
  discarded: ReadonlyArray<CardType>;
}

export default function DiscardPile({ discarded }: DiscardPileProps) {
  const [open, setOpen] = useState(false);
  const topCard = discarded.length > 0 ? discarded[discarded.length - 1] : null;
  const grouped = groupBySuit(discarded);
  const titleId = useId();
  const overlayRef = useRef<HTMLDivElement>(null);
  const handleClose = useCallback(() => setOpen(false), []);
  useEscapeToClose(handleClose, open);
  useFocusTrap(overlayRef, open);

  return (
    <>
      <button
        type="button"
        className="discard-pile"
        aria-label={`Discard pile (${discarded.length} cards)`}
        onClick={() => setOpen(true)}
      >
        {topCard ? (
          <Card card={topCard} decorative />
        ) : (
          <span className="discard-pile-empty">Discard</span>
        )}
        <span className="discard-pile-count">{discarded.length}</span>
      </button>
      {open &&
        createPortal(
          <div
            ref={overlayRef}
            className="modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={handleClose}
          >
            <div
              className="modal discard-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 id={titleId}>Discarded Cards</h3>
              <div className="discard-modal-groups">
                {SUITS.map((suit) => (
                  <section key={suit} className="discard-modal-group">
                    <h4>
                      {SUIT_LABELS[suit]} ({grouped[suit].length})
                    </h4>
                    <div className="discard-modal-cards">
                      {grouped[suit].map((card) => (
                        <Card key={card.id} card={card} />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
              <button className="btn btn--secondary modal-close" onClick={handleClose}>
                Close
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
