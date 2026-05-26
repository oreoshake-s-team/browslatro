import type { Blind, BlindValuesMap } from "../../cards/types";
import "./Round.css";

interface RoundProps {
  blind: Blind;
  roundScore: number;
  requiredScore: number;
  BlindValues: BlindValuesMap;
}

function Round({ blind, BlindValues, roundScore, requiredScore }: RoundProps) {
  const award = "💲".repeat(2 + blind);

  return (
    <>
      <div className="round-info">
        <h3>{BlindValues[blind]}</h3>
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
