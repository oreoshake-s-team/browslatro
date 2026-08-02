import { useTranslation } from "react-i18next";
import Modal from "../system/Modal";
import { Button } from "../ui/Button";
import { cn } from "../ui/cn";
import { formatNumber } from "../../utils/formatNumber";

export interface RoundLostInfo {
  readonly roundScore: number;
  readonly requiredScore: number;
}

interface RoundLostModalProps {
  info: RoundLostInfo;
  onContinue: () => void;
}

const STAT_ROW =
  "flex items-baseline justify-between gap-3 rounded-lg border border-border bg-raised px-3 py-1.5";
const STAT_LABEL = "text-xs tracking-wider text-muted uppercase";
const STAT_VALUE = "text-lg font-semibold text-ink tabular-nums";

export default function RoundLostModal({ info, onContinue }: RoundLostModalProps) {
  const { t } = useTranslation();
  const { roundScore, requiredScore } = info;
  const shortBy = Math.max(0, requiredScore - roundScore);

  return (
    <Modal
      onClose={onContinue}
      labelledBy="round-lost-title"
      accent="danger"
    >
      <div className="flex min-w-55 flex-col gap-4">
        <h2
          id="round-lost-title"
          className="text-center text-lg font-bold text-mult"
        >
          {t("roundEnd.lostTitle")}
        </h2>
        <dl className="flex flex-col gap-1">
          <div className={STAT_ROW}>
            <dt className={STAT_LABEL}>{t("roundEnd.roundScore")}</dt>
            <dd className={STAT_VALUE} data-testid="round-lost-score">
              {formatNumber(roundScore)}
            </dd>
          </div>
          <div className={STAT_ROW}>
            <dt className={STAT_LABEL}>{t("roundEnd.requiredScore")}</dt>
            <dd className={STAT_VALUE} data-testid="round-lost-required">
              {formatNumber(requiredScore)}
            </dd>
          </div>
          <div className={STAT_ROW}>
            <dt className={STAT_LABEL}>{t("roundEnd.shortBy")}</dt>
            <dd
              className={cn(STAT_VALUE, "text-mult")}
              data-testid="round-lost-short-by"
            >
              {formatNumber(shortBy)}
            </dd>
          </div>
        </dl>
        <Button variant="primary" onClick={onContinue} autoFocus>
          {t("roundEnd.tryAgain")}
        </Button>
      </div>
    </Modal>
  );
}
