import "./RunProgress.css";

interface RunProgressProps {
  ante: number;
  round: number;
  money: number;
}

function RunProgress({ ante, round, money }: RunProgressProps) {
  return (
    <div className="run-progress">
      <div className="stat">
        <span className="stat-value">${money}</span>
        <span className="stat-label">Money</span>
      </div>
      <div className="run-progress-row">
        <div className="stat">
          <span className="stat-value">{ante}</span>
          <span className="stat-label">Ante</span>
        </div>
        <div className="stat">
          <span className="stat-value">{round}</span>
          <span className="stat-label">Round</span>
        </div>
      </div>
    </div>
  );
}

export default RunProgress;