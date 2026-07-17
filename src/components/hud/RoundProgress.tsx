import { useTranslation } from "react-i18next";
import { Stat } from "../ui/Stat";

interface RoundProgressProps {
  remainingHands: number;
  remainingDiscards: number;
}

function RoundProgress({
  remainingHands,
  remainingDiscards,
}: RoundProgressProps) {
  const { t } = useTranslation();
  return (
    <div className="flex gap-2">
      <Stat
        label={t("sidebar.hands")}
        value={remainingHands}
        aria-live="polite"
        aria-atomic="true"
        data-testid="hands-stat"
      />
      <Stat
        label={t("sidebar.discards")}
        value={remainingDiscards}
        aria-live="polite"
        aria-atomic="true"
        data-testid="discards-stat"
      />
    </div>
  );
}

export default RoundProgress;
