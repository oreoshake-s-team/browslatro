import "./GameWonScreen.css";
import { useTranslation } from "react-i18next";
import { createPortal } from "react-dom";
import { useEscapeToClose } from "../system/useEscapeToClose";
import type { GameWonInfo } from "../../store/progression";

interface GameWonScreenProps {
  info: GameWonInfo;
  onNewRun: () => void;
  onEndless: () => void;
}

export default function GameWonScreen({
  info,
  onNewRun,
  onEndless,
}: GameWonScreenProps) {
  const { t } = useTranslation();
  const { finalAnte, finalMoney, handsPlayed, blindsSkipped } = info;
  useEscapeToClose(onNewRun, true);

  return createPortal(
    <div
      className="game-won-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-won-title"
    >
      <div
        className="game-won-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="game-won-title" className="game-won-title">
          {t("gameWon.title")}
        </h2>
        <p className="game-won-subtitle">
          {t("gameWon.subtitle", { ante: finalAnte })}
        </p>
        <dl className="game-won-stats">
          <div className="game-won-stat">
            <dt>{t("gameWon.finalAnte")}</dt>
            <dd data-testid="game-won-final-ante">{finalAnte}</dd>
          </div>
          <div className="game-won-stat">
            <dt>{t("gameWon.finalMoney")}</dt>
            <dd data-testid="game-won-final-money">${finalMoney}</dd>
          </div>
          <div className="game-won-stat">
            <dt>{t("gameWon.handsPlayed")}</dt>
            <dd data-testid="game-won-hands-played">{handsPlayed}</dd>
          </div>
          <div className="game-won-stat">
            <dt>{t("gameWon.blindsSkipped")}</dt>
            <dd data-testid="game-won-blinds-skipped">{blindsSkipped}</dd>
          </div>
        </dl>
        <div className="game-won-actions">
          <button
            type="button"
            className="game-won-endless"
            data-testid="game-won-endless"
            onClick={onEndless}
            autoFocus
          >
            {t("gameWon.endlessMode")}
          </button>
          <button
            type="button"
            className="game-won-new-run"
            data-testid="game-won-new-run"
            onClick={onNewRun}
          >
            {t("gameWon.newRun")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
