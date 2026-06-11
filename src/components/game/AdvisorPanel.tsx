import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import "./AdvisorPanel.css";
import { useAdvisor, type AdvisorDeps } from "../../ai/advisor/useAdvisor";
import type { HandOption } from "../../ai/getHandOptions";
import type { Card } from "../../cards/types";
import { tHandLabel } from "../../i18n/handLabels";
import { cardLabel } from "../../scoring/scoringTrace";
import { useGame } from "../../store/game";
import { useEscapeToClose } from "../system/useEscapeToClose";
import { useFocusTrap } from "../system/useFocusTrap";

export interface AdvisorPanelProps {
  readonly onClose: () => void;
  readonly deps?: AdvisorDeps;
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

export type AdvisorVerbosity = "move" | "full";

export const ADVISOR_VERBOSITY_KEY = "browslatro:advisor-verbosity";

function readStoredVerbosity(): AdvisorVerbosity {
  return window.localStorage.getItem(ADVISOR_VERBOSITY_KEY) === "full"
    ? "full"
    : "move";
}

export default function AdvisorPanel({
  onClose,
  deps,
}: AdvisorPanelProps): React.JSX.Element {
  const { t } = useTranslation();
  const { state, requestAdvice } = useAdvisor(deps);
  const overlayRef = useRef<HTMLDivElement>(null);
  useEscapeToClose(onClose, true);
  useFocusTrap(overlayRef);
  const hand = useGame((s) => s.dealt.hand);
  const [verbosity, setVerbosity] = useState<AdvisorVerbosity>(readStoredVerbosity);

  useEffect(() => {
    void requestAdvice({ explain: verbosity === "full" });
  }, [requestAdvice, verbosity]);

  const chooseVerbosity = (next: AdvisorVerbosity): void => {
    window.localStorage.setItem(ADVISOR_VERBOSITY_KEY, next);
    setVerbosity(next);
  };

  return createPortal(
    <div
      ref={overlayRef}
      className="advisor-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="advisor-title"
      data-testid="advisor-panel"
    >
      <div className="advisor-card">
        <h2 id="advisor-title" className="advisor-title">
          <span aria-hidden="true">🎓 </span>
          {t("advisor.title")}
        </h2>
        <div
          className="advisor-verbosity"
          role="group"
          aria-label={t("advisor.verbosityLabel")}
        >
          <button
            className="btn advisor-verbosity-button"
            aria-pressed={verbosity === "move"}
            onClick={() => chooseVerbosity("move")}
          >
            {t("advisor.justTheMove")}
          </button>
          <button
            className="btn advisor-verbosity-button"
            aria-pressed={verbosity === "full"}
            onClick={() => chooseVerbosity("full")}
          >
            {t("advisor.walkMeThrough")}
          </button>
        </div>
        {state.phase === "loading" && (
          <p className="advisor-thinking" role="status">
            {t("advisor.thinking")}
          </p>
        )}
        {state.phase === "ready" && (
          <div className="advisor-report">
            <section className="advisor-section advisor-section--recommendation">
              <h3 className="advisor-section-title">
                {t("advisor.recommendation")}
              </h3>
              <p className="advisor-candidate">
                {describeCandidate(
                  t,
                  state.report.candidates[state.report.advice.recommendationIndex],
                  hand,
                )}
              </p>
              <p className="advisor-explanation">{state.report.advice.explanation}</p>
            </section>
            <section className="advisor-section">
              <h3 className="advisor-section-title">{t("advisor.alternative")}</h3>
              <p className="advisor-candidate">
                {describeCandidate(
                  t,
                  state.report.candidates[state.report.advice.alternativeIndex],
                  hand,
                )}
              </p>
              <p className="advisor-explanation">
                {state.report.advice.whyAlternativeWorse}
              </p>
            </section>
            <section className="advisor-section advisor-section--concept">
              <h3 className="advisor-section-title">{t("advisor.concept")}</h3>
              <p className="advisor-explanation">{state.report.advice.concept}</p>
            </section>
          </div>
        )}
        {state.phase === "move-only" && (
          <div className="advisor-report" data-testid="advisor-move-only">
            <section className="advisor-section advisor-section--recommendation">
              <h3 className="advisor-section-title">
                {t("advisor.recommendation")}
              </h3>
              <p className="advisor-candidate">
                {describeCandidate(t, state.topCandidate, hand)}
              </p>
            </section>
          </div>
        )}
        {state.phase === "degraded" && (
          <div className="advisor-report" data-testid="advisor-degraded">
            {state.topCandidate !== null ? (
              <section className="advisor-section advisor-section--recommendation">
                <h3 className="advisor-section-title">
                  {t("advisor.engineSuggestion")}
                </h3>
                <p className="advisor-candidate">
                  {describeCandidate(t, state.topCandidate, hand)}
                </p>
                <p className="advisor-explanation">{t("advisor.unavailable")}</p>
              </section>
            ) : (
              <p className="advisor-explanation">{t("advisor.noCandidates")}</p>
            )}
          </div>
        )}
        <button className="btn advisor-close-button" onClick={onClose}>
          {t("advisor.close")}
        </button>
      </div>
    </div>,
    document.body,
  );
}
