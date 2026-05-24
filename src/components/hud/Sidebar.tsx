import type { Blind } from "../../types";
import "./Sidebar.css";
import { BlindValues } from "../../constants";
import Round from "./Round";
import RunInfo from "./RunInfo";
import Options from "../options/Options";
import RoundProgress from "./RoundProgress";
import RunProgress from "./RunProgress";
import HandScore from "../game/HandScore";
import type { Hand } from "../../types";

interface SidebarProps {
  blind: Blind;
  ante: number;
  round: number;
  money: number;
  chips: number;
  multiplier: number;
  roundScore: number;
  requiredScore: number;
  selectedHand: Hand;
  remainingHands: number;
  remainingDiscards: number;
  onNewGame: () => void;
  onHighVisibilityChange?: (enabled: boolean) => void;
}

export default function Sidebar({
  blind,
  ante,
  round,
  money,
  chips,
  multiplier,
  roundScore,
  requiredScore,
  selectedHand,
  remainingHands,
  remainingDiscards,
  onNewGame,
  onHighVisibilityChange,
}: SidebarProps) {
  return (
    <div className="sidebar">
      <Round
        blind={blind}
        BlindValues={BlindValues}
        roundScore={roundScore}
        requiredScore={requiredScore}
      />
      <HandScore
        chips={chips}
        multiplier={multiplier}
        selectedHand={selectedHand}
      />
      <div className="sub-info-progress">
        <div className="sub-info">
          <RunInfo />
          <Options
            onNewGame={onNewGame}
            onHighVisibilityChange={onHighVisibilityChange}
          />
        </div>
        <div className="progress">
          <RoundProgress remainingHands={remainingHands} remainingDiscards={remainingDiscards} />
          <RunProgress ante={ante} round={round} money={money} />
        </div>
      </div>
    </div>
  );
}
