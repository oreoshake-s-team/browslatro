import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import "./AdvisorPanel.css";
import {
  readStoredPlayerKey,
  storePlayerKey,
} from "../../ai/advisor/playerKey";
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


export const GET_KEY_URL = "https://console.anthropic.com/settings/keys";

function PlayerKeyForm({
  onSaved,
  focusOnMount,
}: {
  readonly onSaved: () => void;
  readonly focusOnMount: boolean;
}): React.JSX.Element {
  const { t } = useTranslation();
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (focusOnMount) inputRef.current?.focus();
  }, [focusOnMount]);

  return (
    <form
      className="advisor-key-form"
      onSubmit={(event) => {
        event.preventDefault();
        const key = draft.trim();
        if (key === "") return;
        storePlayerKey(key);
        setDraft("");
        onSaved();
      }}
    >
      <label className="advisor-key-label" htmlFor="advisor-key-input">
        {t("advisor.keyLabel")}
      </label>
      <div className="advisor-key-row">
        <input
          id="advisor-key-input"
          ref={inputRef}
          className="advisor-key-input"
          type="password"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="sk-ant-…"
          data-testid="advisor-key-input"
        />
        <button
          type="submit"
          className="btn advisor-key-save"
          disabled={draft.trim() === ""}
        >
          {t("advisor.keySave")}
        </button>
      </div>
      <ol className="advisor-key-steps">
        <li>{t("advisor.keyStep1")}</li>
        <li>{t("advisor.keyStep2")}</li>
        <li>{t("advisor.keyStep3")}</li>
      </ol>
      <a
        className="advisor-key-link"
        href={GET_KEY_URL}
        target="_blank"
        rel="noreferrer"
      >
        {t("advisor.keyLink")}
      </a>
    </form>
  );
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
        {state.phase === "loading-model" && (
          <div className="advisor-loading" role="status">
            <p className="advisor-thinking">{t("advisor.downloadingModel")}</p>
            <progress
              className="advisor-progress"
              aria-label={t("advisor.downloadingModel")}
              value={
                state.progress.total !== null
                  ? state.progress.loaded
                  : undefined
              }
              max={
                state.progress.total !== null
                  ? state.progress.total
                  : undefined
              }
            />
          </div>
        )}
        {state.phase === "querying" && (
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
                <p className="advisor-explanation">
                  {state.code === "rate_limited"
                    ? state.retryAfterSeconds !== undefined
                      ? t("advisor.limitReached", {
                          minutes: Math.max(
                            1,
                            Math.ceil(state.retryAfterSeconds / 60),
                          ),
                        })
                      : t("advisor.limitReachedNoEta")
                    : state.code === "invalid_player_key"
                      ? t("advisor.keyRejected")
                      : t("advisor.unavailable")}
                </p>
              </section>
            ) : (
              <p className="advisor-explanation">{t("advisor.noCandidates")}</p>
            )}
            {(state.code === "invalid_player_key" ||
              (state.code === "rate_limited" &&
                readStoredPlayerKey() === null)) && (
              <PlayerKeyForm
                focusOnMount={state.code === "invalid_player_key"}
                onSaved={() =>
                  void requestAdvice({ explain: verbosity === "full" })
                }
              />
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
