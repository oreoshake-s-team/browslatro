import { useState } from "react";
import { createPortal } from "react-dom";
import "./DiscardPile.css";
import Card from "./Card";
import type { Card as CardType, Suit } from "../types";
import { SUITS, groupBySuit } from "../deck";

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

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        className="discard-pile"
        aria-label={`Discard pile (${discarded.length} cards)`}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        {topCard ? (
          <Card card={topCard} />
        ) : (
          <span className="discard-pile-empty">Discard</span>
        )}
        <span className="discard-pile-count">{discarded.length}</span>
      </div>
      {open &&
        createPortal(
          <div className="modal-overlay" onClick={() => setOpen(false)}>
            <div
              className="modal discard-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <h3>Discarded Cards</h3>
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
              <button className="modal-close" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
