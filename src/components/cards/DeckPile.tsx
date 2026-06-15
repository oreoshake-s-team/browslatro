import { useCallback, useId, useRef, useState, type DragEvent } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import "./DeckPile.css";
import Card from "./Card";
import DeckSummary from "./DeckSummary";
import type { Card as CardType } from "../../cards/types";
import { SUITS, groupBySuit } from "../../cards/deck";
import { useEscapeToClose } from "../system/useEscapeToClose";
import { useFocusTrap } from "../system/useFocusTrap";
import { useMimeDropZone } from "../system/useMimeDropZone";
import { CONSUMABLE_DRAG_MIME } from "../consumables/Consumables";
import { JOKER_DRAG_MIME } from "../jokers/Jokers";


interface DeckPileProps {
  remaining: ReadonlyArray<CardType>;
  consumableDropEnabled?: boolean;
  onConsumableDrop?: () => void;
  jokerDropEnabled?: boolean;
  onJokerDrop?: () => void;
}

export default function DeckPile({
  remaining,
  consumableDropEnabled = false,
  onConsumableDrop,
  jokerDropEnabled = false,
  onJokerDrop,
}: DeckPileProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const grouped = groupBySuit(remaining);
  const titleId = useId();
  const overlayRef = useRef<HTMLDivElement>(null);
  const handleClose = useCallback(() => setOpen(false), []);
  useEscapeToClose(handleClose, open);
  useFocusTrap(overlayRef, open);
  const consumableZone = useMimeDropZone({
    enabled: consumableDropEnabled,
    mime: CONSUMABLE_DRAG_MIME,
    onDrop: onConsumableDrop,
  });
  const jokerZone = useMimeDropZone({
    enabled: jokerDropEnabled,
    mime: JOKER_DRAG_MIME,
    onDrop: onJokerDrop,
  });
  const showDropZone = Boolean(consumableZone.onDrop || jokerZone.onDrop);
  const hover = consumableZone.hover || jokerZone.hover;
  const handleDragOver = (e: DragEvent<HTMLElement>) => {
    consumableZone.onDragOver?.(e);
    jokerZone.onDragOver?.(e);
  };
  const handleDragLeave = (e: DragEvent<HTMLElement>) => {
    consumableZone.onDragLeave?.(e);
    jokerZone.onDragLeave?.(e);
  };
  const handleDrop = (e: DragEvent<HTMLElement>) => {
    consumableZone.onDrop?.(e);
    jokerZone.onDrop?.(e);
  };

  return (
    <>
      <button
        type="button"
        className={`deck-pile${showDropZone ? " deck-pile-drop-target" : ""}${
          hover ? " deck-pile-drop-hover" : ""
        }`}
        aria-label={t("a11y.deckPile", { total: remaining.length })}
        data-testid="deck-pile"
        data-consumable-drop-active={showDropZone || undefined}
        onClick={() => setOpen(true)}
        onDragOver={showDropZone ? handleDragOver : undefined}
        onDragLeave={showDropZone ? handleDragLeave : undefined}
        onDrop={showDropZone ? handleDrop : undefined}
      >
        <span className="deck-pile-count">{remaining.length}</span>
        {showDropZone && (
          <span
            className="consumable-drop-overlay consumable-drop-overlay-sell"
            data-testid="consumable-drop-overlay-sell"
            aria-hidden="true"
          >
            <span className="consumable-drop-overlay-label">{t("cardPiles.sell")}</span>
          </span>
        )}
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
              className="modal deck-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 id={titleId}>{t("cardPiles.remainingTitle")}</h3>
              <div className="deck-modal-body">
                <DeckSummary remaining={remaining} />
                <div className="deck-modal-groups">
                  {SUITS.map((suit) => (
                    <section key={suit} className="deck-modal-group">
                      <h4>
                        {t(`suits.${suit}`)} ({grouped[suit].length})
                      </h4>
                      <div className="deck-modal-cards">
                        {grouped[suit].map((card) => (
                          <Card key={card.id} card={card} />
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
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
