import { useTranslation } from "react-i18next";
import "./Sidebar.css";
import { BlindValues } from "../../constants";
import Round from "./Round";
import RunInfo from "./RunInfo";
import Options from "../options/Options";
import Help from "./Help";
import RoundProgress from "./RoundProgress";
import RunProgress from "./RunProgress";
import ScoringTrace from "./ScoringTrace";
import ScoringTraceButton from "./ScoringTraceButton";
import HumanPlayLog from "./HumanPlayLog";
import SidebarFooter from "./SidebarFooter";
import HandScore from "../game/HandScore";
import type { HandLabel } from "../../scoring/handEvaluator";
import type { AnimationSpeed } from "../system/preferences";
import { useSidebarViewModel } from "./useSidebarViewModel";

interface SidebarProps {
  onNewGame: () => void;
  onHighVisibilityChange?: (enabled: boolean) => void;
  onAnimationSpeedChange?: (value: AnimationSpeed) => void;
}

export default function Sidebar({
  onNewGame,
  onHighVisibilityChange,
  onAnimationSpeedChange,
}: SidebarProps) {
  const { t } = useTranslation();
  const {
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
    handStats,
    ownedVouchers,
    currentBoss,
    firstPlayedHandLabel,
    scoringEvents,
  } = useSidebarViewModel();
  return (
    <aside className="sidebar" aria-label={t("a11y.gameStatus")}>
      <Round
        blind={blind}
        BlindValues={BlindValues}
        roundScore={roundScore}
        requiredScore={requiredScore}
        boss={currentBoss}
        firstPlayedHandLabel={firstPlayedHandLabel}
      />
      <HandScore
        chips={chips}
        multiplier={multiplier}
        selectedHand={selectedHand}
        selectedHandLevel={
          selectedHand
            ? handStats[selectedHand.label as HandLabel]?.level ?? null
            : null
        }
      />
      <div className="sub-info-progress">
        <div className="sub-info">
          <RunInfo
            handPlayCounts={handPlayCounts}
            handStats={handStats}
            ownedVouchers={ownedVouchers}
          />
          <Options
            onNewGame={onNewGame}
            onHighVisibilityChange={onHighVisibilityChange}
            onAnimationSpeedChange={onAnimationSpeedChange}
          />
          <Help />
          <ScoringTraceButton
            events={scoringEvents}
            className="btn btn--ghost sub-info__scoring-log"
          >
            {t("scoringTrace.open")}
          </ScoringTraceButton>
        </div>
        <div className="progress">
          <RoundProgress remainingHands={remainingHands} remainingDiscards={remainingDiscards} />
          <RunProgress ante={ante} round={round} money={money} />
        </div>
      </div>
      <ScoringTrace events={scoringEvents} />
      <HumanPlayLog />
      <SidebarFooter />
    </aside>
  );
}
