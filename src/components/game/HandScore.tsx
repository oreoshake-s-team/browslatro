import type { Hand } from "../../types";
import "./HandScore.css";

interface HandScoreProps {
  chips: number;
  multiplier: number;
  selectedHand: Hand | null;
}

function HandScore({ chips, multiplier, selectedHand }: HandScoreProps) {
  return (
    <div className="hand-score">
      {selectedHand !== null && <h3>{selectedHand.label}</h3>}
      <p>
        <span key={`chips-${chips}`} className="chips">{chips}</span>
        <span>X</span>
        <span key={`mult-${multiplier}`} className="multiplier">{multiplier}</span>
      </p>
    </div>
  );
}

export default HandScore;
