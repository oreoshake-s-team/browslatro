import { Hand } from "./Game";

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
        <span className="chips">{chips}</span>
        <span>X</span>
        <span className="multiplier">{multiplier}</span>
      </p>
    </div>
  );
}

export default HandScore;
