import { useTranslation } from "react-i18next";
import type { Blind, BlindValuesMap } from "../../cards/types";
import { tHandLabel } from "../../i18n/handLabels";
import type { BossBlind } from "../../items/bosses";
import type { HandLabel } from "../../scoring/handEvaluator";
import "./Round.css";

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
      <div className="round-info">
        <h2 className="blind-label">{blindLabel}</h2>
        {blind === 3 && boss && (
          <p className="boss-effect">{boss.description}</p>
        )}
        {showLockedHand && (
          <p
            className="boss-locked-hand"
            data-testid="boss-locked-hand"
            aria-label={t("a11y.lockedTo", {
              hand: firstPlayedHandLabel
                ? tHandLabel(t, firstPlayedHandLabel)
                : "",
            })}
          >
            {t("sidebar.lockedTo")}{" "}
            <strong>{firstPlayedHandLabel ? tHandLabel(t, firstPlayedHandLabel) : null}</strong>
          </p>
        )}
        <h3>{t("sidebar.scoreAtLeast", { score: requiredScore })}</h3>
        <h4>{t("sidebar.toEarn", { award })}</h4>
      </div>
      <div className="round-score">
        <span className="round-score-label">{t("sidebar.roundScore")}</span>
        <span className="round-score-value">{roundScore}</span>
      </div>
    </>
  );
}

export default Round;
