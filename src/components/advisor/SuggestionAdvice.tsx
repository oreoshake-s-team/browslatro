import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { readStoredPlayerKey } from "../../ai/advisor/playerKey";
import type {
  ContextAdviceCandidate,
  SuggestionState,
} from "../../ai/advisor/useSuggestion";
import type { DownloadProgress } from "../../ai/policy";
import PlayerKeyForm from "../game/PlayerKeyForm";
import { useModelLoadProgress } from "../game/useModelLoadProgress";
import { Button } from "../ui/Button";

const adviceBoxClass =
  "flex flex-col gap-2 rounded-xl border border-advisor/50 bg-advisor/10 p-3";
const sectionLabelClass =
  "text-xs font-bold tracking-wider text-muted uppercase";
const moveClass = "font-bold text-advisor";

export function describeContextCandidate(
  t: TFunction,
  candidate: ContextAdviceCandidate,
): string {
  switch (candidate.action) {
    case "buy":
      return t("advisor.buyCandidate", {
        name: candidate.item.name,
        cost: candidate.item.cost,
      });
    case "sell":
      return t("advisor.sellCandidate", {
        name: candidate.item.name,
        value: -candidate.item.cost,
      });
    case "use":
      return t("advisor.useCandidate", { name: candidate.item.name });
    case "reroll":
      return t("advisor.rerollCandidate", { cost: candidate.cost });
    case "leave":
      return t("advisor.leaveCandidate");
    case "pick":
      return t("advisor.pickCandidate", { name: candidate.option.name });
    case "skip":
      return t("advisor.skipCandidate");
  }
}

export function errorMessage(
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
  return t("advisor.suggestError");
}

export interface SuggestionAdviceProps<TAction> {
  readonly state: SuggestionState<TAction>;
  readonly onApply: () => void;
  readonly onDismiss: () => void;
  readonly onRetry: () => void;
  readonly modelProgress?: DownloadProgress | null;
}

export default function SuggestionAdvice<TAction>({
  state,
  onApply,
  onDismiss,
  onRetry,
  modelProgress = null,
}: SuggestionAdviceProps<TAction>): React.JSX.Element | null {
  const { t } = useTranslation();
  const loadProgress = useModelLoadProgress(modelProgress);
  switch (state.phase) {
    case "idle":
    case "coach":
    case "asking":
      return null;
    case "loading": {
      const onnxCandidate =
        state.onnxIndex !== null ? state.candidates[state.onnxIndex] : undefined;
      const downloading = modelProgress !== null;
      return (
        <div
          className={adviceBoxClass}
          role="status"
          data-testid="suggestion-onnx"
        >
          <p className="text-muted">
            {downloading ? t("advisor.downloadingModel") : t("advisor.thinking")}
          </p>
          {downloading && (
            <progress
              className="h-1.5 w-full accent-advisor"
              data-testid="suggestion-model-progress"
              aria-label={t("advisor.downloadingModel")}
              value={loadProgress}
              max={1}
            />
          )}
          {onnxCandidate !== undefined && (
            <section className="space-y-1 border-l-2 border-success pl-2">
              <p className={sectionLabelClass}>{t("advisor.recommendation")}</p>
              <p
                className={moveClass}
                data-testid="suggestion-onnx-recommendation"
              >
                {describeContextCandidate(t, onnxCandidate)}
              </p>
              <Button
                variant="advisor"
                data-testid="suggestion-apply"
                onClick={onApply}
              >
                {t("advisor.suggestApply")}
              </Button>
            </section>
          )}
        </div>
      );
    }
    case "error": {
      const showKeyForm =
        state.code === "invalid_player_key" ||
        (state.code === "rate_limited" && readStoredPlayerKey() === null);
      return (
        <div className={adviceBoxClass} data-testid="suggestion-error">
          <p role="status">
            {errorMessage(t, state.code, state.retryAfterSeconds)}
          </p>
          {showKeyForm ? (
            <PlayerKeyForm
              focusOnMount={state.code === "invalid_player_key"}
              onSaved={onRetry}
            />
          ) : (
            <Button
              variant="secondary"
              className="self-start"
              data-testid="suggestion-retry"
              onClick={onRetry}
            >
              {t("advisor.suggestRetry")}
            </Button>
          )}
        </div>
      );
    }
    case "ready": {
      const { advice, candidates } = state;
      const recommended = candidates[advice.recommendationIndex];
      const alternative = candidates[advice.alternativeIndex];
      return (
        <div className={adviceBoxClass} data-testid="suggestion-advice">
          <section className="space-y-1 border-l-2 border-success pl-2">
            <p className={sectionLabelClass}>{t("advisor.recommendation")}</p>
            {recommended !== undefined && (
              <p className={moveClass} data-testid="suggestion-recommendation">
                {describeContextCandidate(t, recommended)}
              </p>
            )}
            <p>{advice.explanation}</p>
          </section>
          {alternative !== undefined && (
            <section className="space-y-1 border-l-2 border-border pl-2">
              <p className={sectionLabelClass}>{t("advisor.alternative")}</p>
              <p className={moveClass}>
                {describeContextCandidate(t, alternative)}
              </p>
              <p>{advice.whyAlternativeWorse}</p>
            </section>
          )}
          <section className="space-y-1 border-l-2 border-advisor pl-2">
            <p className={sectionLabelClass}>{t("advisor.concept")}</p>
            <p className="text-muted italic">{advice.concept}</p>
          </section>
          <div className="flex flex-wrap gap-1">
            <Button
              variant="advisor"
              data-testid="suggestion-apply"
              onClick={onApply}
            >
              <span aria-hidden="true">✅ </span>
              {t("advisor.suggestApply")}
            </Button>
            <Button
              variant="secondary"
              data-testid="suggestion-dismiss"
              onClick={onDismiss}
            >
              {t("advisor.suggestDismiss")}
            </Button>
          </div>
        </div>
      );
    }
  }
}
