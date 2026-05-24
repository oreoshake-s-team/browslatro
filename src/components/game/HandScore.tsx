import type { Hand } from "../../types";
import "./HandScore.css";

interface HandScoreProps {
  chips: number;
  multiplier: number;
  selectedHand: Hand;
}

function HandScore({ chips, multiplier, selectedHand }: HandScoreProps) {
  return (
    <div className="hand-score">
      <h3>{selectedHand.label}</h3>
      <p>
        <span key={chips} className="chips">{chips}</span>
        <span>X</span>
        <span key={multiplier} className="multiplier">{multiplier}</span>
      </p>
    </div>
  );
}

export default HandScore;
