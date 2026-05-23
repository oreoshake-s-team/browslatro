import type { Blind } from "../types";
import { BlindValues } from "../constants";
import Round from "./Round";
import RunInfo from "./RunInfo";
import Options from "./Options";
import RoundProgress from "./RoundProgress";
import RunProgress from "./RunProgress";
import HandScore from "./HandScore";

interface SidebarProps {
  blind: Blind;
  ante: number;
  round: number;
  money: number;
  chips: number;
  multiplier: number;
  roundScore: number;
  handleReset: () => void;
}

export default function Sidebar({
  blind,
  ante,
  round,
  money,
  chips,
  multiplier,
  roundScore,
  handleReset,
}: SidebarProps) {
  return (
    <div className="sidebar">
      <Round
        blind={blind}
        ante={ante}
        BlindValues={BlindValues}
        roundScore={roundScore}
      />
      <HandScore chips={chips} multiplier={multiplier} />
      <div className="sub-info-progress">
        <div className="sub-info">
          <RunInfo />
          <Options onReset={handleReset} />
        </div>
        <div className="progress">
          <RoundProgress />
          <RunProgress ante={ante} round={round} money={money} />
        </div>
      </div>
    </div>
  );
}
