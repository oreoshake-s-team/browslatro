import "./JokerGrantAcknowledge.css";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { createPortal } from "react-dom";
import type { Joker } from "../../items/jokers";
import { useEscapeToClose } from "../system/useEscapeToClose";
import { useFocusTrap } from "../system/useFocusTrap";

interface JokerGrantAcknowledgeProps {
  readonly jokers: ReadonlyArray<Joker>;
  readonly onAcknowledge: () => void;
}

export default function JokerGrantAcknowledge({
  jokers,
  onAcknowledge,
}: JokerGrantAcknowledgeProps) {
  const { t } = useTranslation();
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
      className="joker-grant-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="joker-grant-title"
      data-testid="joker-grant-modal"
    >
      <div className="joker-grant-modal">
        <h2 id="joker-grant-title" className="joker-grant-title">
          {title}
        </h2>
        <ul className="joker-grant-list" aria-label={t("a11y.grantedJokers")}>
          {jokers.map((joker, idx) => (
            <li
              key={`${joker.id}-${idx}`}
              className="joker-grant-list-item"
              data-testid={`joker-grant-item-${idx}`}
            >
              <span className="joker-grant-name">{joker.name}</span>
              <span className="joker-grant-description">
                {joker.description}
              </span>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="btn btn--primary joker-grant-ok"
          data-testid="joker-grant-ok"
          onClick={onAcknowledge}
          autoFocus
        >
          OK
        </button>
      </div>
    </div>,
    document.body,
  );
}
