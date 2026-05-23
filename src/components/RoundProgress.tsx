interface RoundProgressProps {
  remainingHands: number;
  remainingDiscards: number;
}

function RoundProgress({ remainingHands, remainingDiscards }: RoundProgressProps) {
  return (
    <div className="round-progress">
      <div className="stat">
        <span className="stat-value">{remainingHands}</span>
        <span className="stat-label">Hands</span>
      </div>
      <div className="stat">
        <span className="stat-value">{remainingDiscards}</span>
        <span className="stat-label">Discards</span>
      </div>
    </div>
  );
}

export default RoundProgress;
