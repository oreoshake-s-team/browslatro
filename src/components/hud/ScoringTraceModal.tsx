import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import type { ScoringEvent } from "../../scoring/scoringTrace";
import ScoringTraceContent from "./ScoringTraceContent";
import { useEscapeToClose } from "../system/useEscapeToClose";
import { useFocusTrap } from "../system/useFocusTrap";
import { Button } from "../ui/Button";

interface ScoringTraceModalProps {
  readonly events: ReadonlyArray<ScoringEvent>;
  readonly onClose: () => void;
}

export default function ScoringTraceModal({
  events,
  onClose,
}: ScoringTraceModalProps) {
  const { t } = useTranslation();
  const overlayRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  useEscapeToClose(onClose, true);
  useFocusTrap(overlayRef);
  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [events]);
  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="scoring-trace-modal-title"
      data-modal-overlay=""
      onClick={onClose}
    >
      <div
        className="flex h-[85vh] w-[min(90vw,70rem)] flex-col gap-3 rounded-xl border-2 border-money/50 bg-bg p-6 font-mono text-ink shadow-2xl portrait-narrow:h-full portrait-narrow:w-full portrait-narrow:rounded-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-2">
          <h2
            id="scoring-trace-modal-title"
            className="text-lg font-bold tracking-widest text-money uppercase"
          >
            {t("scoringTrace.title")}
          </h2>
          <Button
            variant="ghost"
            onClick={onClose}
            aria-label={t("a11y.closeScoringTrace")}
            autoFocus
          >
            <span aria-hidden="true">✕ </span>
            {t("scoringTrace.close")}
          </Button>
        </div>
        <div
          ref={bodyRef}
          className="min-h-0 flex-1 overflow-y-auto text-sm focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
          data-testid="scoring-trace-modal-body"
          role="log"
          aria-live="polite"
          aria-label={t("a11y.scoringTraceLog")}
          tabIndex={0}
        >
          <ScoringTraceContent events={events} idPrefix="scoring-trace-modal" />
        </div>
      </div>
    </div>,
    document.body,
  );
}
