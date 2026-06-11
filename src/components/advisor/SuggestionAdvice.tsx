import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { readStoredPlayerKey } from "../../ai/advisor/playerKey";
import type {
  ContextAdviceCandidate,
  SuggestionState,
} from "../../ai/advisor/useSuggestion";
import PlayerKeyForm from "../game/PlayerKeyForm";
import "./SuggestionAdvice.css";

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
    case "reroll":
      return t("advisor.rerollCandidate", { cost: candidate.cost });
    case "leave":
      return t("advisor.leaveCandidate");
    case "pick":
      return t("advisor.pickCandidate", { name: candidate.option.name });
    case "play":
      return t("advisor.playBlindCandidate", {
        scoreTarget: candidate.scoreTarget,
        payout: candidate.payout,
      });
    case "skip":
      return "tag" in candidate
        ? t("advisor.skipBlindCandidate", { name: candidate.tag.name })
        : t("advisor.skipCandidate");
  }
}

function errorMessage(
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
}

export default function SuggestionAdvice<TAction>({
  state,
  onApply,
  onDismiss,
  onRetry,
}: SuggestionAdviceProps<TAction>): React.JSX.Element | null {
  const { t } = useTranslation();
  switch (state.phase) {
    case "idle":
      return null;
    case "loading":
      return (
        <p className="suggestion-advice-status" role="status">
          {t("advisor.thinking")}
        </p>
      );
    case "error": {
      const showKeyForm =
        state.code === "invalid_player_key" ||
        (state.code === "rate_limited" && readStoredPlayerKey() === null);
      return (
        <div className="suggestion-advice" data-testid="suggestion-error">
          <p role="status">
            {errorMessage(t, state.code, state.retryAfterSeconds)}
          </p>
          {showKeyForm ? (
            <PlayerKeyForm
              focusOnMount={state.code === "invalid_player_key"}
              onSaved={onRetry}
            />
          ) : (
            <button
              type="button"
              className="btn btn--secondary suggestion-retry"
              data-testid="suggestion-retry"
              onClick={onRetry}
            >
              {t("advisor.suggestRetry")}
            </button>
          )}
        </div>
      );
    }
    case "ready": {
      const { advice, candidates } = state;
      const recommended = candidates[advice.recommendationIndex];
      const alternative = candidates[advice.alternativeIndex];
      return (
        <div className="suggestion-advice" data-testid="suggestion-advice">
          <section className="suggestion-section suggestion-section--recommendation">
            <p className="suggestion-label">{t("advisor.recommendation")}</p>
            {recommended !== undefined && (
              <p
                className="suggestion-move"
                data-testid="suggestion-recommendation"
              >
                {describeContextCandidate(t, recommended)}
              </p>
            )}
            <p>{advice.explanation}</p>
          </section>
          {alternative !== undefined && (
            <section className="suggestion-section">
              <p className="suggestion-label">{t("advisor.alternative")}</p>
              <p className="suggestion-move">
                {describeContextCandidate(t, alternative)}
              </p>
              <p>{advice.whyAlternativeWorse}</p>
            </section>
          )}
          <section className="suggestion-section suggestion-section--concept">
            <p className="suggestion-label">{t("advisor.concept")}</p>
            <p className="suggestion-concept">{advice.concept}</p>
          </section>
          <div className="suggestion-actions">
            <button
              type="button"
              className="btn suggestion-apply"
              data-testid="suggestion-apply"
              onClick={onApply}
            >
              <span aria-hidden="true">✅ </span>
              {t("advisor.suggestApply")}
            </button>
            <button
              type="button"
              className="btn btn--secondary suggestion-dismiss"
              data-testid="suggestion-dismiss"
              onClick={onDismiss}
            >
              {t("advisor.suggestDismiss")}
            </button>
          </div>
        </div>
      );
    }
  }
}
