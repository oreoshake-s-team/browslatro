import { useTranslation } from "react-i18next";
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
    <aside
      className="flex w-75 shrink-0 flex-col gap-4 overflow-y-auto border-r border-border bg-surface p-4 portrait-narrow:h-auto portrait-narrow:w-full portrait-narrow:flex-row portrait-narrow:flex-wrap portrait-narrow:items-start portrait-narrow:border-r-0 portrait-narrow:border-b portrait-narrow:p-2 landscape-narrow:w-50 landscape-narrow:gap-2 landscape-narrow:p-2"
      aria-label={t("a11y.gameStatus")}
    >
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
            ? (handStats[selectedHand.label as HandLabel]?.level ?? null)
            : null
        }
      />
      <div className="flex flex-col gap-3 portrait-narrow:min-w-40 portrait-narrow:flex-1">
        <div className="grid grid-cols-2 gap-2">
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
            className="hidden cursor-pointer items-center justify-center rounded-lg border border-border px-3 py-1 text-xs font-semibold text-muted hover:bg-white/5 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus portrait-narrow:inline-flex"
          >
            {t("scoringTrace.open")}
          </ScoringTraceButton>
        </div>
        <div className="flex flex-col gap-2">
          <RoundProgress
            remainingHands={remainingHands}
            remainingDiscards={remainingDiscards}
          />
          <RunProgress ante={ante} round={round} money={money} />
        </div>
      </div>
      <ScoringTrace events={scoringEvents} />
      <HumanPlayLog />
      <SidebarFooter />
    </aside>
  );
}
