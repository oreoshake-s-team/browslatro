import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import "./RunProgress.css";

interface RunProgressProps {
  ante: number;
  round: number;
  money: number;
}

function RunProgress({ ante, round, money }: RunProgressProps) {
  const { t } = useTranslation();
  const hasMountedRef = useRef(false);
  useEffect(() => {
    hasMountedRef.current = true;
  }, []);
  return (
    <div className="run-progress">
      <div className="stat" aria-live="polite" aria-atomic="true">
        <span
          key={money}
          className={
            hasMountedRef.current ? "stat-value money-bounce" : "stat-value"
          }
          data-testid="money-value"
        >
          ${money}
        </span>
        <span className="stat-label">{t("sidebar.money")}</span>
      </div>
      <div className="run-progress-row">
        <div className="stat">
          <span className="stat-value">{ante}</span>
          <span className="stat-label">{t("sidebar.ante")}</span>
        </div>
        <div className="stat">
          <span className="stat-value">{round}</span>
          <span className="stat-label">{t("sidebar.round")}</span>
        </div>
      </div>
    </div>
  );
}

export default RunProgress;
