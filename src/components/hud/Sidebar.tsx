import { useTranslation } from "react-i18next";
import type { Blind } from "../../cards/types";
import "./Sidebar.css";
import { BlindValues } from "../../constants";
import Round from "./Round";
import RunInfo, { type HandPlayCounts } from "./RunInfo";
import Options from "../options/Options";
import Help from "./Help";
import RoundProgress from "./RoundProgress";
import RunProgress from "./RunProgress";
import ScoringTrace from "./ScoringTrace";
import ScoringTraceButton from "./ScoringTraceButton";
import SidebarFooter from "./SidebarFooter";
import HandScore from "../game/HandScore";
import type { Hand } from "../../cards/types";
import type { HandLabel } from "../../scoring/handEvaluator";
import type { HandStats } from "../../scoring/handStats";
import type { BossBlind } from "../../items/bosses";
import type { Voucher } from "../../items/vouchers";
import type { ScoringEvent } from "../../scoring/scoringTrace";
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
  handStats: HandStats;
  ownedVouchers: ReadonlyArray<Voucher>;
  currentBoss: BossBlind | null;
  firstPlayedHandLabel?: HandLabel | null;
  scoringEvents: ReadonlyArray<ScoringEvent>;
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
  handStats,
  ownedVouchers,
  currentBoss,
  firstPlayedHandLabel = null,
  scoringEvents,
  onNewGame,
  onHighVisibilityChange,
  onAnimationSpeedChange,
}: SidebarProps) {
  const { t } = useTranslation();
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
      <SidebarFooter />
    </aside>
  );
}
