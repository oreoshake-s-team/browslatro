import type { Blind, BlindValuesMap } from "../types";

interface RoundProps {
  blind: Blind;
  ante: number;
  BlindValues: BlindValuesMap;
}

const BASE_CHIPS = [300, 800, 2000, 5000, 11000, 20000, 35000, 50000] as const;
const BLIND_MULTIPLIERS = [1, 1.5, 2] as const;

function Round({ blind, ante, BlindValues }: RoundProps) {
  const requiredScore = BASE_CHIPS[ante - 1] * BLIND_MULTIPLIERS[blind - 1];
  const award = "💲".repeat(2 + blind);

  return (
    <div className="round-info">
      <h3>{BlindValues[blind]}</h3>
      <h4>Score at least: {requiredScore}</h4>
      <p>to earn {award}</p>
    </div>
  );
}

export default Round;