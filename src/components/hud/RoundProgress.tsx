import { useTranslation } from "react-i18next";
import "./RoundProgress.css";

interface RoundProgressProps {
  remainingHands: number;
  remainingDiscards: number;
}

function RoundProgress({ remainingHands, remainingDiscards }: RoundProgressProps) {
  const { t } = useTranslation();
  return (
    <div className="round-progress">
      <div
        className="stat"
        aria-live="polite"
        aria-atomic="true"
        data-testid="hands-stat"
      >
        <span className="stat-value">{remainingHands}</span>
        <span className="stat-label">{t("sidebar.hands")}</span>
      </div>
      <div
        className="stat"
        aria-live="polite"
        aria-atomic="true"
        data-testid="discards-stat"
      >
        <span className="stat-value">{remainingDiscards}</span>
        <span className="stat-label">{t("sidebar.discards")}</span>
      </div>
    </div>
  );
}

export default RoundProgress;
