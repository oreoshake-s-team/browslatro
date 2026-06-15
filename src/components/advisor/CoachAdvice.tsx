import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { readStoredPlayerKey } from "../../ai/advisor/playerKey";
import type {
  ContextAdviceCandidate,
  SuggestionState,
} from "../../ai/advisor/useSuggestion";
import type { DownloadProgress } from "../../ai/policy";
import PlayerKeyForm from "../game/PlayerKeyForm";
import { useModelLoadProgress } from "../game/useModelLoadProgress";
import AdviceFeedbackControl from "./AdviceFeedbackControl";
import { describeContextCandidate, errorMessage } from "./SuggestionAdvice";
import "./CoachAdvice.css";

function applyActionLabel(
  t: TFunction,
  candidate: ContextAdviceCandidate,
): string {
  if (candidate.action === "play") return t("advisor.playApply");
  if (candidate.action === "skip" && "tag" in candidate) {
    return t("advisor.skipApply");
  }
  return t("advisor.suggestApply");
}

export interface CoachAdviceProps<TAction> {
  readonly state: SuggestionState<TAction>;
  readonly onApply: () => void;
  readonly onAskAi: () => void;
  readonly onDismiss: () => void;
  readonly onFeedback?: (correctedIndex: number | null) => void;
  readonly modelProgress?: DownloadProgress | null;
}

export default function CoachAdvice<TAction>({
  state,
  onApply,
  onAskAi,
  onDismiss,
  onFeedback,
  modelProgress = null,
}: CoachAdviceProps<TAction>): React.JSX.Element | null {
  const { t } = useTranslation();
  const loadProgress = useModelLoadProgress(modelProgress);
  if (state.phase === "idle") return null;

  const coachCandidate =
    state.onnxIndex !== null ? state.candidates[state.onnxIndex] : undefined;
  const downloading = modelProgress !== null;

  return (
    <div className="coach-advice" data-testid="coach-advice">
      <div className="coach-advice-head">
        <p className="coach-advice-badge">
          <span aria-hidden="true">⚡ </span>
          {t("advisor.coachLabel")}
        </p>
        <button
          type="button"
          className="coach-advice-dismiss"
          data-testid="coach-dismiss"
          aria-label={t("advisor.coachHide")}
          onClick={onDismiss}
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>

      {coachCandidate === undefined ? (
        <p className="coach-advice-status" role="status">
          {downloading ? t("advisor.downloadingModel") : t("advisor.coachComputing")}
        </p>
      ) : (
        <>
          <p className="coach-advice-move" data-testid="coach-recommendation">
            {describeContextCandidate(t, coachCandidate)}
          </p>
          <div className="coach-advice-actions">
            <button
              type="button"
              className="btn coach-advice-apply"
              data-testid="coach-apply"
              onClick={onApply}
            >
              <span aria-hidden="true">✅ </span>
              {applyActionLabel(t, coachCandidate)}
            </button>
            {onFeedback !== undefined && (
              <AdviceFeedbackControl
                candidateLabels={state.candidates.map((c) =>
                  describeContextCandidate(t, c),
                )}
                onSubmit={onFeedback}
              />
            )}
          </div>
        </>
      )}

      {downloading && (
        <progress
          className="coach-advice-progress"
          data-testid="coach-model-progress"
          aria-label={t("advisor.downloadingModel")}
          value={loadProgress}
          max={1}
        />
      )}

      <AiSection state={state} onAskAi={onAskAi} />
    </div>
  );
}

function AiSection<TAction>({
  state,
  onAskAi,
}: {
  readonly state: SuggestionState<TAction>;
  readonly onAskAi: () => void;
}): React.JSX.Element | null {
  const { t } = useTranslation();
  switch (state.phase) {
    case "coach": {
      const hasKey = readStoredPlayerKey() !== null;
      return (
        <button
          type="button"
          className="btn btn--secondary coach-advice-ask"
          data-testid="coach-ask-ai"
          onClick={onAskAi}
        >
          <span aria-hidden="true">🤖 </span>
          {t(hasKey ? "advisor.askAiButtonByok" : "advisor.askAiButton")}
        </button>
      );
    }
    case "asking":
      return (
        <p className="coach-advice-ai-status" data-testid="coach-ai-thinking" role="status">
          {t("advisor.aiThinking")}
        </p>
      );
    case "ready": {
      const aiIndex = state.advice.recommendationIndex;
      const agrees = aiIndex === state.onnxIndex;
      const aiCandidate = state.candidates[aiIndex];
      return (
        <section className="coach-advice-ai" data-testid="coach-ai-verdict">
          <p className="coach-advice-ai-label">
            <span aria-hidden="true">🤖 </span>
            {agrees
              ? t("advisor.aiAgrees")
              : t("advisor.aiSuggestsInstead", {
                  move: aiCandidate !== undefined ? describeContextCandidate(t, aiCandidate) : "",
                })}
          </p>
          <p className="coach-advice-ai-explanation">{state.advice.explanation}</p>
        </section>
      );
    }
    case "error": {
      const showKeyForm =
        state.code === "invalid_player_key" ||
        (state.code === "rate_limited" && readStoredPlayerKey() === null);
      return (
        <section
          className="coach-advice-ai coach-advice-ai--error"
          data-testid="coach-ai-error"
        >
          <p role="status">{errorMessage(t, state.code, state.retryAfterSeconds)}</p>
          {showKeyForm ? (
            <PlayerKeyForm
              focusOnMount={state.code === "invalid_player_key"}
              onSaved={onAskAi}
            />
          ) : (
            <button
              type="button"
              className="btn btn--secondary coach-advice-ask"
              data-testid="coach-ai-retry"
              onClick={onAskAi}
            >
              {t("advisor.suggestRetry")}
            </button>
          )}
        </section>
      );
    }
    default:
      return null;
  }
}
