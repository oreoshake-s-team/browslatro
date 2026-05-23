import type { Blind, BlindValuesMap } from "../types";

interface RoundProps {
  blind: Blind;
  ante: number;
  roundScore: number;
  BlindValues: BlindValuesMap;
}

const BASE_CHIPS = [300, 800, 2000, 5000, 11000, 20000, 35000, 50000] as const;
const BLIND_MULTIPLIERS = [1, 1.5, 2] as const;

function Round({ blind, ante, BlindValues, roundScore }: RoundProps) {
  const requiredScore = BASE_CHIPS[ante - 1] * BLIND_MULTIPLIERS[blind - 1];
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
