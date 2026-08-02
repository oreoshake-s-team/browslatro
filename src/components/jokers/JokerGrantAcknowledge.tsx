import { useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  localizedJokerDescription,
  localizedJokerName,
} from "../../i18n/jokerOverrides";
import { createPortal } from "react-dom";
import type { Joker } from "../../items/jokers";
import { useEscapeToClose } from "../system/useEscapeToClose";
import { useFocusTrap } from "../system/useFocusTrap";
import { Button } from "../ui/Button";

interface JokerGrantAcknowledgeProps {
  readonly jokers: ReadonlyArray<Joker>;
  readonly onAcknowledge: () => void;
}

export default function JokerGrantAcknowledge({
  jokers,
  onAcknowledge,
}: JokerGrantAcknowledgeProps) {
  const { t, i18n } = useTranslation();
  const overlayRef = useRef<HTMLDivElement>(null);
  useEscapeToClose(onAcknowledge, jokers.length > 0);
  useFocusTrap(overlayRef, jokers.length > 0);
  if (jokers.length === 0) return null;
  const title =
    jokers.length === 1
      ? "Gained 1 Joker"
      : `Gained ${jokers.length} Jokers`;
  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-44 flex items-center justify-center bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby="joker-grant-title"
      data-modal-overlay=""
      data-testid="joker-grant-modal"
    >
      <div className="flex max-h-[80vh] w-70 max-w-[80vw] flex-col gap-3 overflow-y-auto rounded-xl border-2 border-success bg-surface p-5 shadow-xl">
        <h2
          id="joker-grant-title"
          className="text-center text-base font-bold tracking-wide text-success"
        >
          {title}
        </h2>
        <ul
          className="flex list-none flex-col gap-1.5"
          aria-label={t("a11y.grantedJokers")}
        >
          {jokers.map((joker, idx) => (
            <li
              key={`${joker.id}-${idx}`}
              className="flex flex-col gap-0.5 rounded-lg border border-success bg-success/10 px-2 py-1.5"
              data-testid={`joker-grant-item-${idx}`}
            >
              <span className="font-bold">
                {localizedJokerName(i18n.language, joker.id, joker.name)}
              </span>
              <span className="text-sm text-muted">
                {localizedJokerDescription(
                  i18n.language,
                  joker.id,
                  joker.description,
                )}
              </span>
            </li>
          ))}
        </ul>
        <Button
          variant="primary"
          className="self-center px-6"
          data-testid="joker-grant-ok"
          onClick={onAcknowledge}
          autoFocus
        >
          OK
        </Button>
      </div>
    </div>,
    document.body,
  );
}
