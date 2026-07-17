import { useTranslation } from "react-i18next";
import type { Blind, BlindValuesMap } from "../../cards/types";
import { tHandLabel } from "../../i18n/handLabels";
import type { BossBlind } from "../../items/bosses";
import type { HandLabel } from "../../scoring/handEvaluator";
import { formatNumber } from "../../utils/formatNumber";

interface RoundProps {
  blind: Blind;
  roundScore: number;
  requiredScore: number;
  BlindValues: BlindValuesMap;
  boss?: BossBlind | null;
  firstPlayedHandLabel?: HandLabel | null;
}

function Round({
  blind,
  BlindValues,
  roundScore,
  requiredScore,
  boss = null,
  firstPlayedHandLabel = null,
}: RoundProps) {
  const { t } = useTranslation();
  const award = "💲".repeat(2 + blind);
  const blindLabel = blind === 3 && boss ? boss.name : BlindValues[blind];
  const showLockedHand =
    blind === 3 &&
    boss?.effect.kind === "single-hand-type" &&
    firstPlayedHandLabel !== null;

  return (
    <>
      <div className="flex flex-col items-center gap-1 text-center">
        <h2 className="text-2xl font-bold">{blindLabel}</h2>
        {blind === 3 && boss && (
          <p className="text-sm text-mult italic">{boss.description}</p>
        )}
        {showLockedHand && (
          <p
            className="rounded-md bg-mult/15 px-2 py-1 text-sm text-mult"
            data-testid="boss-locked-hand"
            aria-label={t("a11y.lockedTo", {
              hand: firstPlayedHandLabel
                ? tHandLabel(t, firstPlayedHandLabel)
                : "",
            })}
          >
            {t("sidebar.lockedTo")}{" "}
            <strong>
              {firstPlayedHandLabel
                ? tHandLabel(t, firstPlayedHandLabel)
                : null}
            </strong>
          </p>
        )}
        <h3 className="text-sm text-muted">
          {t("sidebar.scoreAtLeast", { score: formatNumber(requiredScore) })}
        </h3>
        <h4 className="text-sm text-muted">{t("sidebar.toEarn", { award })}</h4>
      </div>
      <div className="flex flex-col items-center gap-1">
        <span className="text-xs tracking-widest text-muted uppercase">
          {t("sidebar.roundScore")}
        </span>
        <span className="text-2xl font-bold text-success tabular-nums">
          {formatNumber(roundScore)}
        </span>
      </div>
    </>
  );
}

export default Round;
