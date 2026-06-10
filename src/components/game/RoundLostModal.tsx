import "./RoundLostModal.css";
import { useTranslation } from "react-i18next";
import { createPortal } from "react-dom";
import { useEscapeToClose } from "../system/useEscapeToClose";

export interface RoundLostInfo {
  readonly roundScore: number;
  readonly requiredScore: number;
}

interface RoundLostModalProps {
  info: RoundLostInfo;
  onContinue: () => void;
}

export default function RoundLostModal({ info, onContinue }: RoundLostModalProps) {
  const { t } = useTranslation();
  const { roundScore, requiredScore } = info;
  const shortBy = Math.max(0, requiredScore - roundScore);
  useEscapeToClose(onContinue, true);

  return createPortal(
    <div
      className="round-lost-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="round-lost-title"
    >
      <div
        className="round-lost-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="round-lost-title" className="round-lost-title">
          {t("roundEnd.lostTitle")}
        </h2>
        <dl className="round-lost-stats">
          <div className="round-lost-stat">
            <dt>{t("roundEnd.roundScore")}</dt>
            <dd data-testid="round-lost-score">{roundScore}</dd>
          </div>
          <div className="round-lost-stat">
            <dt>{t("roundEnd.requiredScore")}</dt>
            <dd data-testid="round-lost-required">{requiredScore}</dd>
          </div>
          <div className="round-lost-stat round-lost-stat-short">
            <dt>{t("roundEnd.shortBy")}</dt>
            <dd data-testid="round-lost-short-by">{shortBy}</dd>
          </div>
        </dl>
        <button
          type="button"
          className="btn btn--primary round-lost-continue"
          onClick={onContinue}
          autoFocus
        >
          {t("roundEnd.tryAgain")}
        </button>
      </div>
    </div>,
    document.body,
  );
}
