import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Stat } from "../ui/Stat";

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
    <div className="flex flex-col gap-2">
      <Stat
        key={money}
        label={t("sidebar.money")}
        value={`$${money}`}
        tone="money"
        size="lg"
        valueTestId="money-value"
        aria-live="polite"
        aria-atomic="true"
        className={hasMountedRef.current ? "animate-pulse-flash" : undefined}
      />
      <div className="flex gap-2">
        <Stat label={t("sidebar.ante")} value={ante} />
        <Stat label={t("sidebar.round")} value={round} />
      </div>
    </div>
  );
}

export default RunProgress;
