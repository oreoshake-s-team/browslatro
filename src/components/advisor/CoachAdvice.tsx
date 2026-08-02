import { useTranslation } from "react-i18next";
import { readStoredPlayerKey } from "../../ai/advisor/playerKey";
import type { SuggestionState } from "../../ai/advisor/useSuggestion";
import type { DownloadProgress } from "../../ai/policy";
import PlayerKeyForm from "../game/PlayerKeyForm";
import { useModelLoadProgress } from "../game/useModelLoadProgress";
import { Button } from "../ui/Button";
import AdviceFeedbackControl from "./AdviceFeedbackControl";
import { describeContextCandidate, errorMessage } from "./SuggestionAdvice";
import RenderProfiler from "../../dev/RenderProfiler";

export interface CoachAdviceProps<TAction> {
  readonly state: SuggestionState<TAction>;
  readonly onApply: () => void;
  readonly onAskAi: () => void;
  readonly onDismiss: () => void;
  readonly onFeedback?: (correctedIndex: number | null) => void;
  readonly onAgree?: () => void;
  readonly feedbackSubmitLabel?: string;
  readonly modelProgress?: DownloadProgress | null;
  readonly applyDisabled?: boolean;
  readonly applyDisabledReason?: string;
}

export default function CoachAdvice<TAction>({
  state,
  onApply,
  onAskAi,
  onDismiss,
  onFeedback,
  onAgree,
  feedbackSubmitLabel,
  modelProgress = null,
  applyDisabled = false,
  applyDisabledReason,
}: CoachAdviceProps<TAction>): React.JSX.Element | null {
  const { t } = useTranslation();
  const loadProgress = useModelLoadProgress(modelProgress);
  if (state.phase === "idle") return null;

  const coachCandidate =
    state.onnxIndex !== null ? state.candidates[state.onnxIndex] : undefined;
  const coachUnavailable =
    state.phase === "coach" && state.coachUnavailable === true;
  const downloading = modelProgress !== null;

  return (
    <RenderProfiler id="CoachAdvice">
    <div
      className="flex flex-col gap-2 rounded-xl border border-advisor/50 bg-advisor/10 p-3"
      data-testid="coach-advice"
    >
      <div className="flex items-center justify-between gap-1">
        <p className="text-xs font-bold tracking-wider text-advisor uppercase">
          <span aria-hidden="true">⚡ </span>
          {t("advisor.coachLabel")}
        </p>
        <button
          type="button"
          className="inline-flex size-6 cursor-pointer items-center justify-center rounded-full border border-border leading-none text-muted hover:border-ink hover:text-ink focus-visible:border-ink focus-visible:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          data-testid="coach-dismiss"
          aria-label={t("advisor.coachHide")}
          onClick={onDismiss}
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>

      {coachCandidate === undefined ? (
        coachUnavailable ? (
          <p
            className="text-muted"
            role="status"
            data-testid="coach-unavailable"
          >
            {t("advisor.coachUnavailable")}
          </p>
        ) : (
          <p className="text-muted" role="status">
            {downloading
              ? t("advisor.downloadingModel")
              : t("advisor.coachComputing")}
          </p>
        )
      ) : (
        <>
          <p className="font-bold text-advisor" data-testid="coach-recommendation">
            {describeContextCandidate(t, coachCandidate)}
          </p>
          <div className="flex flex-wrap items-start gap-1">
            {onAgree === undefined && (
              <Button
                variant="advisor"
                className="self-start"
                data-testid="coach-apply"
                onClick={onApply}
                disabled={applyDisabled}
              >
                <span aria-hidden="true">✅ </span>
                {t("advisor.suggestApply")}
              </Button>
            )}
            {onAgree === undefined &&
              applyDisabled &&
              applyDisabledReason !== undefined && (
                <p
                  className="text-xs text-muted"
                  role="note"
                  data-testid="coach-apply-blocked"
                >
                  {applyDisabledReason}
                </p>
              )}
            {onFeedback !== undefined && onAgree !== undefined && (
              <AdviceFeedbackControl
                candidateLabels={state.candidates.map((c) =>
                  describeContextCandidate(t, c),
                )}
                onSubmit={onFeedback}
                onAgree={onAgree}
                agreeDisabled={applyDisabled}
                agreeDisabledReason={applyDisabledReason}
                submitLabel={feedbackSubmitLabel}
              />
            )}
          </div>
        </>
      )}

      {downloading && (
        <progress
          className="h-1.5 w-full accent-advisor"
          data-testid="coach-model-progress"
          aria-label={t("advisor.downloadingModel")}
          value={loadProgress}
          max={1}
        />
      )}

      <AiSection state={state} onAskAi={onAskAi} />
    </div>
    </RenderProfiler>
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
        <Button
          variant="secondary"
          size="sm"
          className="self-start"
          data-testid="coach-ask-ai"
          onClick={onAskAi}
        >
          <span aria-hidden="true">🤖 </span>
          {t(hasKey ? "advisor.askAiButtonByok" : "advisor.askAiButton")}
        </Button>
      );
    }
    case "asking":
      return (
        <p
          className="text-muted italic"
          data-testid="coach-ai-thinking"
          role="status"
        >
          {t("advisor.aiThinking")}
        </p>
      );
    case "ready": {
      const aiIndex = state.advice.recommendationIndex;
      const agrees = aiIndex === state.onnxIndex;
      const aiCandidate = state.candidates[aiIndex];
      return (
        <section
          className="border-l-2 border-advisor pl-2"
          data-testid="coach-ai-verdict"
        >
          <p className="mb-1 font-bold">
            <span aria-hidden="true">🤖 </span>
            {agrees
              ? t("advisor.aiAgrees")
              : t("advisor.aiSuggestsInstead", {
                  move:
                    aiCandidate !== undefined
                      ? describeContextCandidate(t, aiCandidate)
                      : "",
                })}
          </p>
          <p className="text-muted">{state.advice.explanation}</p>
        </section>
      );
    }
    case "error": {
      const showKeyForm =
        state.code === "invalid_player_key" ||
        (state.code === "rate_limited" && readStoredPlayerKey() === null);
      return (
        <section
          className="border-l-2 border-mult pl-2"
          data-testid="coach-ai-error"
        >
          <p role="status">
            {errorMessage(t, state.code, state.retryAfterSeconds)}
          </p>
          {showKeyForm ? (
            <PlayerKeyForm
              focusOnMount={state.code === "invalid_player_key"}
              onSaved={onAskAi}
            />
          ) : (
            <Button
              variant="secondary"
              size="sm"
              className="mt-1 self-start"
              data-testid="coach-ai-retry"
              onClick={onAskAi}
            >
              {t("advisor.suggestRetry")}
            </Button>
          )}
        </section>
      );
    }
    default:
      return null;
  }
}
