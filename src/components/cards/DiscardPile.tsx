import { useCallback, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import "./DiscardPile.css";
import Card from "./Card";
import type { Card as CardType } from "../../cards/types";
import { SUITS, groupBySuit } from "../../cards/deck";
import { useEscapeToClose } from "../system/useEscapeToClose";
import { useFocusTrap } from "../system/useFocusTrap";


interface DiscardPileProps {
  discarded: ReadonlyArray<CardType>;
}

export default function DiscardPile({ discarded }: DiscardPileProps) {
  const { t } = useTranslation();
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
        aria-label={t("a11y.discardPile", { total: discarded.length })}
        data-testid="discard-pile"
        onClick={() => setOpen(true)}
      >
        {topCard ? (
          <Card card={topCard} decorative />
        ) : (
          <span className="discard-pile-empty">{t("cardPiles.discardLabel")}</span>
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
              <h3 id={titleId}>{t("cardPiles.discardedTitle")}</h3>
              <div className="discard-modal-groups">
                {SUITS.map((suit) => (
                  <section key={suit} className="discard-modal-group">
                    <h4>
                      {t(`suits.${suit}`)} ({grouped[suit].length})
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
                {t("cardPiles.close")}
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
