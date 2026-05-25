import type { Blind } from "../../types";
import "./Sidebar.css";
import { BlindValues } from "../../constants";
import Round from "./Round";
import RunInfo, { type HandPlayCounts } from "./RunInfo";
import Options from "../options/Options";
import RoundProgress from "./RoundProgress";
import RunProgress from "./RunProgress";
import HandScore from "../game/HandScore";
import type { Hand } from "../../types";
import type { AnimationSpeed } from "../system/preferences";

interface SidebarProps {
  blind: Blind;
  ante: number;
  round: number;
  money: number;
  chips: number;
  multiplier: number;
  roundScore: number;
  requiredScore: number;
  selectedHand: Hand | null;
  remainingHands: number;
  remainingDiscards: number;
  handPlayCounts: HandPlayCounts;
  onNewGame: () => void;
  onHighVisibilityChange?: (enabled: boolean) => void;
  onAnimationSpeedChange?: (value: AnimationSpeed) => void;
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
  handPlayCounts,
  onNewGame,
  onHighVisibilityChange,
  onAnimationSpeedChange,
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
          <RunInfo handPlayCounts={handPlayCounts} />
          <Options
            onNewGame={onNewGame}
            onHighVisibilityChange={onHighVisibilityChange}
            onAnimationSpeedChange={onAnimationSpeedChange}
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
