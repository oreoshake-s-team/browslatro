import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { createPortal } from "react-dom";
import { useEscapeToClose } from "../system/useEscapeToClose";
import { useFocusTrap } from "../system/useFocusTrap";
import { Button } from "../ui/Button";
import type { GameWonInfo } from "../../store/progression";

interface GameWonScreenProps {
  info: GameWonInfo;
  onNewRun: () => void;
  onEndless: () => void;
}

const STAT_ROW =
  "flex items-baseline justify-between gap-3 rounded-lg border border-money/40 bg-raised px-3 py-1.5";
const STAT_LABEL = "text-xs tracking-wider text-muted uppercase";
const STAT_VALUE = "text-lg font-semibold text-ink tabular-nums";

export default function GameWonScreen({
  info,
  onNewRun,
  onEndless,
}: GameWonScreenProps) {
  const { t } = useTranslation();
  const { finalAnte, finalMoney, handsPlayed, blindsSkipped } = info;
  const overlayRef = useRef<HTMLDivElement>(null);
  useEscapeToClose(onNewRun, true);
  useFocusTrap(overlayRef);

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-6 portrait-narrow:p-3"
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-won-title"
    >
      <div
        className="flex w-full max-w-90 flex-col gap-4 rounded-xl border-2 border-money bg-surface p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="game-won-title"
          className="text-center text-2xl font-bold text-money"
        >
          {t("gameWon.title")}
        </h2>
        <p className="text-center text-sm text-muted">
          {t("gameWon.subtitle", { ante: finalAnte })}
        </p>
        <dl className="flex flex-col gap-1">
          <div className={STAT_ROW}>
            <dt className={STAT_LABEL}>{t("gameWon.finalAnte")}</dt>
            <dd className={STAT_VALUE} data-testid="game-won-final-ante">
              {finalAnte}
            </dd>
          </div>
          <div className={STAT_ROW}>
            <dt className={STAT_LABEL}>{t("gameWon.finalMoney")}</dt>
            <dd className={STAT_VALUE} data-testid="game-won-final-money">
              ${finalMoney}
            </dd>
          </div>
          <div className={STAT_ROW}>
            <dt className={STAT_LABEL}>{t("gameWon.handsPlayed")}</dt>
            <dd className={STAT_VALUE} data-testid="game-won-hands-played">
              {handsPlayed}
            </dd>
          </div>
          <div className={STAT_ROW}>
            <dt className={STAT_LABEL}>{t("gameWon.blindsSkipped")}</dt>
            <dd className={STAT_VALUE} data-testid="game-won-blinds-skipped">
              {blindsSkipped}
            </dd>
          </div>
        </dl>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Button
            variant="primary"
            data-testid="game-won-endless"
            onClick={onEndless}
            autoFocus
          >
            {t("gameWon.endlessMode")}
          </Button>
          <Button
            variant="ghost"
            data-testid="game-won-new-run"
            onClick={onNewRun}
          >
            {t("gameWon.newRun")}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
