import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import type { HandOption } from "../../ai/getHandOptions";
import type { MoveExplanationState } from "../../ai/advisor/useMoveExplanation";
import { readStoredPlayerKey } from "../../ai/advisor/playerKey";
import type { DownloadProgress } from "../../ai/policy";
import type { Card } from "../../cards/types";
import { tHandLabel } from "../../i18n/handLabels";
import { cardLabel } from "../../scoring/scoringTrace";
import { useGame } from "../../store/game";
import { useModelLoadProgress } from "./useModelLoadProgress";
import PlayerKeyForm from "./PlayerKeyForm";
import AdviceFeedbackControl from "../advisor/AdviceFeedbackControl";
import "./AutopilotControls.css";

export interface AutopilotControlsProps {
  readonly proposal: HandOption | null;
  readonly modelProgress: DownloadProgress | null;
  readonly proposalUnavailable?: boolean;
  readonly explanation: MoveExplanationState;
  readonly feedbackCandidates?: ReadonlyArray<HandOption> | null;
  readonly feedbackRecorded?: boolean;
  readonly onApprove: () => void;
  readonly onAskAi: () => void;
  readonly onRetry: () => void;
  readonly onFeedback?: (correctedIndex: number | null) => void;
  readonly onPreviewFeedback?: (option: HandOption) => void;
}

function describeProposal(t: TFunction, proposal: HandOption): string {
  if (proposal.action === "play") {
    return t("advisor.autopilotPlayProposal", {
      hand: tHandLabel(t, proposal.handLabel),
    });
  }
  return t("advisor.autopilotDiscardProposal");
}

function describeCandidate(
  t: TFunction,
  candidate: HandOption,
  hand: ReadonlyArray<Card>,
): string {
  const cards = candidate.cardIds
    .map((id) => hand.find((card) => card.id === id))
    .filter((card): card is Card => card !== undefined)
    .map(cardLabel)
    .join(" ");
  if (candidate.action === "play") {
    return t("advisor.playCandidate", {
      hand: tHandLabel(t, candidate.handLabel),
      cards,
      score: candidate.score,
    });
  }
  return t("advisor.discardCandidate", { cards });
}

function explanationError(
  t: TFunction,
  code: string,
  retryAfterSeconds: number | undefined,
): string {
  if (code === "rate_limited") {
    return retryAfterSeconds !== undefined
      ? t("advisor.limitReached", {
          minutes: Math.max(1, Math.ceil(retryAfterSeconds / 60)),
        })
      : t("advisor.limitReachedNoEta");
  }
  if (code === "invalid_player_key") return t("advisor.keyRejected");
  return t("advisor.autopilotExplainError");
}

function renderExplanation(
  t: TFunction,
  explanation: MoveExplanationState,
  hand: ReadonlyArray<Card>,
  onRetry: () => void,
): React.JSX.Element | null {
  switch (explanation.phase) {
    case "idle":
      return null;
    case "loading":
      return (
        <p className="autopilot-explanation" role="status">
          {t("advisor.thinking")}
        </p>
      );
    case "error": {
      const showKeyForm =
        explanation.code === "invalid_player_key" ||
        (explanation.code === "rate_limited" &&
          readStoredPlayerKey() === null);
      return (
        <div className="autopilot-explanation">
          <p role="status">
            {explanationError(t, explanation.code, explanation.retryAfterSeconds)}
          </p>
          {showKeyForm && (
            <PlayerKeyForm
              focusOnMount={explanation.code === "invalid_player_key"}
              onSaved={onRetry}
            />
          )}
        </div>
      );
    }
    case "ready": {
      const { candidates, advice } = explanation;
      const recommended = candidates[advice.recommendationIndex];
      const alternative = candidates[advice.alternativeIndex];
      const showAlternative =
        advice.alternativeIndex !== advice.recommendationIndex &&
        alternative !== undefined;
      return (
        <div className="autopilot-explanation">
          <section className="autopilot-advice autopilot-advice--recommendation">
            <p className="autopilot-advice-label">{t("advisor.recommendation")}</p>
            {recommended !== undefined && (
              <p className="autopilot-advice-move">
                {describeCandidate(t, recommended, hand)}
              </p>
            )}
            <p>{advice.explanation}</p>
          </section>
          {showAlternative && (
            <section className="autopilot-advice">
              <p className="autopilot-advice-label">{t("advisor.alternative")}</p>
              <p className="autopilot-advice-move">
                {describeCandidate(t, alternative, hand)}
              </p>
              <p>{advice.whyAlternativeWorse}</p>
            </section>
          )}
          <section className="autopilot-advice autopilot-advice--concept">
            <p className="autopilot-advice-label">{t("advisor.concept")}</p>
            <p className="autopilot-concept">{advice.concept}</p>
          </section>
        </div>
      );
    }
  }
}

export default function AutopilotControls({
  proposal,
  modelProgress,
  proposalUnavailable = false,
  explanation,
  feedbackCandidates = null,
  feedbackRecorded = false,
  onApprove,
  onAskAi,
  onRetry,
  onFeedback,
  onPreviewFeedback,
}: AutopilotControlsProps): React.JSX.Element {
  const { t } = useTranslation();
  const hand = useGame((s) => s.dealt.hand);
  const loadProgress = useModelLoadProgress(modelProgress);
  const canGiveFeedback =
    proposal !== null &&
    onFeedback !== undefined &&
    feedbackCandidates !== null &&
    feedbackCandidates.length > 0;
  return (
    <div
      className="autopilot-controls"
      role="group"
      aria-label={t("advisor.autopilot")}
    >
      <p className="autopilot-title">
        <span aria-hidden="true">💡 </span>
        {t("advisor.suggestTitle")}
      </p>
      {feedbackRecorded && proposal === null && (
        <p className="autopilot-feedback-recorded" role="status">
          {t("advisor.feedbackRecorded")}
        </p>
      )}
      {proposal !== null ? (
        <p className="autopilot-proposal" role="status">
          {describeProposal(t, proposal)}
        </p>
      ) : modelProgress !== null ? (
        <div className="autopilot-loading" role="status">
          <p className="autopilot-proposal">{t("advisor.downloadingModel")}</p>
          <progress
            className="autopilot-progress"
            aria-label={t("advisor.downloadingModel")}
            value={loadProgress}
            max={1}
          />
        </div>
      ) : proposalUnavailable ? (
        <p
          className="autopilot-proposal"
          data-testid="autopilot-no-suggestion"
          role="status"
        >
          {t("advisor.noSuggestionAvailable")}
        </p>
      ) : null}
      <div className="autopilot-actions">
        {proposal !== null && (
          <button className="btn autopilot-approve-button" onClick={onApprove}>
            <span aria-hidden="true">✅ </span>
            {t("advisor.autopilotApprove")}
          </button>
        )}
        {proposal !== null && (
          <button
            className="btn btn--advisor autopilot-askai-button"
            onClick={onAskAi}
            disabled={explanation.phase === "loading"}
          >
            <span aria-hidden="true">🤖 </span>
            {t("advisor.autopilotAskAi")}
          </button>
        )}
        {canGiveFeedback && (
          <AdviceFeedbackControl
            candidateLabels={feedbackCandidates.map((c) =>
              describeCandidate(t, c, hand),
            )}
            onSubmit={onFeedback}
            onPreview={
              onPreviewFeedback === undefined
                ? undefined
                : (index) => {
                    const option = feedbackCandidates[index];
                    if (option !== undefined) onPreviewFeedback(option);
                  }
            }
            submitLabel={t("advisor.feedbackPlayInstead")}
          />
        )}
      </div>
      {renderExplanation(t, explanation, hand, onRetry)}
    </div>
  );
}
