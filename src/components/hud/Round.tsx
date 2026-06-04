import type { Blind, BlindValuesMap } from "../../cards/types";
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
  const award = "💲".repeat(2 + blind);
  const blindLabel = blind === 3 && boss ? boss.name : BlindValues[blind];
  const showLockedHand =
    blind === 3 &&
    boss?.effect.kind === "single-hand-type" &&
    firstPlayedHandLabel !== null;

  return (
    <>
      <div className="round-info">
        <h3 className="blind-label">{blindLabel}</h3>
        {blind === 3 && boss && (
          <p className="boss-effect">{boss.description}</p>
        )}
        {showLockedHand && (
          <p
            className="boss-locked-hand"
            data-testid="boss-locked-hand"
            aria-label={`Locked to ${firstPlayedHandLabel}`}
          >
            Locked to: <strong>{firstPlayedHandLabel}</strong>
          </p>
        )}
        <h3>Score at least: {requiredScore}</h3>
        <h4>to earn {award}</h4>
      </div>
      <div className="round-score">
        <span className="round-score-label">Round score</span>
        <span className="round-score-value">{roundScore}</span>
      </div>
    </>
  );
}

export default Round;
