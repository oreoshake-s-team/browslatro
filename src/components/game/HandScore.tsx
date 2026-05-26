import type { Hand } from "../../cards/types";
import "./HandScore.css";

interface HandScoreProps {
  chips: number;
  multiplier: number;
  selectedHand: Hand | null;
  selectedHandLevel?: number | null;
}

function HandScore({
  chips,
  multiplier,
  selectedHand,
  selectedHandLevel = null,
}: HandScoreProps) {
  const hasLevel =
    selectedHand !== null && typeof selectedHandLevel === "number";
  return (
    <div className="hand-score">
      {selectedHand !== null && (
        <h3
          aria-label={
            hasLevel
              ? `${selectedHand.label}, level ${selectedHandLevel}`
              : undefined
          }
        >
          <span>{selectedHand.label}</span>
          {hasLevel && (
            <span className="hand-score-level" aria-hidden="true">
              Lv {selectedHandLevel}
            </span>
          )}
        </h3>
      )}
      <p>
        <span key={`chips-${chips}`} className="chips">{chips}</span>
        <span>X</span>
        <span key={`mult-${multiplier}`} className="multiplier">{multiplier}</span>
      </p>
    </div>
  );
}

export default HandScore;
