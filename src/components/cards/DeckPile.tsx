import { memo, useCallback, useId, useRef, useState, type DragEvent } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { cn } from "../ui/cn";
import { Button } from "../ui/Button";
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

function DeckPile({
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
        className={cn(
          "relative flex aspect-[5/7] w-16 cursor-pointer items-center justify-center rounded-lg border border-black/40 bg-(--deck-back,var(--color-chips)) shadow-md shadow-black/30 transition-all hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
          showDropZone && "ring-2 ring-money",
          hover && "ring-4 ring-money",
        )}
        aria-label={t("a11y.deckPile", { total: remaining.length })}
        data-testid="deck-pile"
        data-consumable-drop-active={showDropZone || undefined}
        onClick={() => setOpen(true)}
        onDragOver={showDropZone ? handleDragOver : undefined}
        onDragLeave={showDropZone ? handleDragLeave : undefined}
        onDrop={showDropZone ? handleDrop : undefined}
      >
        <span
          className="rounded-md bg-black/50 px-1.5 py-0.5 text-sm font-bold text-white"
          data-testid="deck-pile-count"
        >
          {remaining.length}
        </span>
        {showDropZone && (
          <span
            className="absolute inset-0 flex items-center justify-center rounded-lg bg-money/30 text-sm font-bold text-white"
            data-testid="consumable-drop-overlay-sell"
            aria-hidden="true"
          >
            <span>{t("cardPiles.sell")}</span>
          </span>
        )}
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
              className="flex max-h-[85vh] w-[94vw] max-w-7xl flex-col gap-4 overflow-y-auto rounded-xl border border-border bg-surface p-4 shadow-xl"
              data-testid="deck-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 id={titleId} className="text-lg font-bold text-ink">
                {t("cardPiles.remainingTitle")}
              </h3>
              <div className="flex w-full items-stretch gap-6">
                <DeckSummary remaining={remaining} />
                <div
                  className="flex min-w-0 flex-1 flex-col gap-5"
                  data-testid="deck-modal-groups"
                >
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

export default memo(DeckPile);
