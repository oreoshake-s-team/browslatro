import { useCallback, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import Card from "./Card";
import { Button } from "../ui/Button";
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
        className="relative flex aspect-[5/7] w-16 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-muted bg-raised p-0 transition-all hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        aria-label={t("a11y.discardPile", { total: discarded.length })}
        data-testid="discard-pile"
        onClick={() => setOpen(true)}
      >
        {topCard ? (
          <Card card={topCard} decorative />
        ) : (
          <span className="text-xs font-semibold tracking-wide text-muted uppercase">
            {t("cardPiles.discardLabel")}
          </span>
        )}
        <span
          className="absolute -right-1 -bottom-1 rounded bg-muted px-1 py-0.5 text-xs font-bold text-bg"
          data-testid="discard-pile-count"
        >
          {discarded.length}
        </span>
      </button>
      {open &&
        createPortal(
          <div
            ref={overlayRef}
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/60"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            data-modal-overlay=""
            data-testid="modal-overlay"
            onClick={handleClose}
          >
            <div
              className="flex max-h-[85vh] w-[90vw] max-w-4xl flex-col gap-4 overflow-y-auto rounded-xl border border-border bg-surface p-4 shadow-xl"
              data-testid="discard-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 id={titleId} className="text-lg font-bold text-ink">
                {t("cardPiles.discardedTitle")}
              </h3>
              <div className="flex w-full flex-col gap-5">
                {SUITS.map((suit) => (
                  <section key={suit} className="flex flex-col gap-2">
                    <h4 className="text-xs font-semibold tracking-wide text-muted uppercase">
                      {t(`suits.${suit}`)} ({grouped[suit].length})
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {grouped[suit].map((card) => (
                        <Card key={card.id} card={card} />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
              <Button className="self-end" onClick={handleClose}>
                {t("cardPiles.close")}
              </Button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
