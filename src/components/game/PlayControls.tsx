import { useTranslation } from "react-i18next";
import { tHandLabel } from "../../i18n/handLabels";
import { useGame } from "../../store/game";
import AutopilotControls from "./AutopilotControls";
import { useAutopilotSession } from "./autopilotSession";
import { useGameSession } from "./gameSession";
import { Button } from "../ui/Button";

export default function PlayControls() {
  const { submitHand, discardSelected, isScoring } = useGameSession();
  const autopilotSession = useAutopilotSession();
  const { t } = useTranslation();
  const selectedIds = useGame((s) => s.selectedIds);
  const discardingIds = useGame((s) => s.discardingIds);
  const remainingDiscards = useGame((s) => s.remainingDiscards);
  const selectedHand = useGame((s) => s.selectedHand);
  const chips = useGame((s) => s.chips);
  const multiplier = useGame((s) => s.multiplier);
  const devChipsBonus = useGame((s) => s.devChipsBonus);
  const devMultBonus = useGame((s) => s.devMultBonus);
  const devMultFactor = useGame((s) => s.devMultFactor);

  const canDiscard =
    selectedIds.size > 0 &&
    remainingDiscards > 0 &&
    discardingIds.size === 0 &&
    !isScoring;

  return (
    <div className="flex w-full max-w-225 flex-col gap-3">
      <div className="flex gap-3">
        <Button
          variant="primary"
          size="lg"
          className="flex-1"
          onClick={submitHand}
          disabled={isScoring || selectedIds.size === 0}
          aria-label={
            selectedHand
              ? t("a11y.submitHandWith", {
                  hand: tHandLabel(t, selectedHand.label),
                  chips: chips + devChipsBonus,
                  mult: (multiplier + devMultBonus) * devMultFactor,
                })
              : t("a11y.submitHand")
          }
        >
          <span aria-hidden="true">🃏 </span>
          {t("game.submitHand")}
          {selectedHand && (
            <span
              className="ml-2 inline-flex items-center gap-2 rounded-md bg-black/20 px-2 py-0.5 text-sm font-semibold"
              data-testid="submit-hand-detected"
            >
              <span>{tHandLabel(t, selectedHand.label)}</span>
              <span>
                <span>{chips + devChipsBonus}</span>
                <span aria-hidden="true"> × </span>
                <span>{(multiplier + devMultBonus) * devMultFactor}</span>
              </span>
            </span>
          )}
        </Button>
        <Button size="lg" onClick={discardSelected} disabled={!canDiscard}>
          <span aria-hidden="true">🗑️ </span>Discard
        </Button>
        {autopilotSession && (
          <Button
            variant="advisor"
            size="lg"
            onClick={autopilotSession.onToggle}
            aria-pressed={autopilotSession.enabled}
          >
            <span aria-hidden="true">🤖 </span>
            {t("advisor.autopilot")}
          </Button>
        )}
      </div>
      {autopilotSession &&
        (autopilotSession.autopilot.pendingProposal ||
          autopilotSession.autopilot.modelProgress ||
          autopilotSession.autopilot.proposalUnavailable ||
          autopilotSession.autopilot.advisorUnavailable ||
          autopilotSession.feedbackRecorded) && (
          <AutopilotControls
            proposal={autopilotSession.autopilot.pendingProposal}
            modelProgress={autopilotSession.autopilot.modelProgress}
            proposalUnavailable={autopilotSession.autopilot.proposalUnavailable}
            advisorUnavailable={autopilotSession.autopilot.advisorUnavailable}
            explanation={autopilotSession.explanation}
            feedbackCandidates={
              autopilotSession.policyDecision?.candidates ?? null
            }
            feedbackRecorded={autopilotSession.feedbackRecorded}
            onApprove={autopilotSession.autopilot.approve}
            onAskAi={autopilotSession.onAskAi}
            onRetry={autopilotSession.onAskAi}
            onFeedback={autopilotSession.onFeedback}
            onAgree={autopilotSession.onAgree}
            onPreviewFeedback={autopilotSession.autopilot.previewOption}
          />
        )}
    </div>
  );
}
