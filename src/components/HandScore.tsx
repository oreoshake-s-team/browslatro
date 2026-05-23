interface HandScoreProps {
  chips: number;
  multiplier: number;
}

function HandScore({ chips, multiplier }: HandScoreProps) {
  return (
    <div className="hand-score">
      <h3>Two pair</h3>
      <p>
        <span className="chips">{chips}</span>
        <span>X</span>
        <span className="multiplier">{multiplier}</span>
      </p>
    </div>
  );
}

export default HandScore;
