import type { Blind, BlindValuesMap } from "../../cards/types";
import type { BossBlind } from "../../items/bosses";
import "./Round.css";

interface RoundProps {
  blind: Blind;
  roundScore: number;
  requiredScore: number;
  BlindValues: BlindValuesMap;
  boss?: BossBlind | null;
}

function Round({
  blind,
  BlindValues,
  roundScore,
  requiredScore,
  boss = null,
}: RoundProps) {
  const award = "💲".repeat(2 + blind);
  const blindLabel = blind === 3 && boss ? boss.name : BlindValues[blind];

  return (
    <>
      <div className="round-info">
        <h3 title={blind === 3 && boss ? boss.description : undefined}>
          {blindLabel}
        </h3>
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
