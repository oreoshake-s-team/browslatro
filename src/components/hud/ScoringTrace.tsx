import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ScoringEvent } from "../../scoring/scoringTrace";
import ScoringTraceContent from "./ScoringTraceContent";
import LazyChunkSpinner from "../system/LazyChunkSpinner";
import "./ScoringTrace.css";

const ScoringTraceModal = lazy(() => import("./ScoringTraceModal"));

interface ScoringTraceProps {
  readonly events: ReadonlyArray<ScoringEvent>;
}

export default function ScoringTrace({ events }: ScoringTraceProps) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const open = useCallback(() => setIsExpanded(true), []);
  const close = useCallback(() => setIsExpanded(false), []);
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [events]);
  return (
    <section className="scoring-trace">
      <div className="scoring-trace__header">
        <h2 className="scoring-trace__title">{t("scoringTrace.title")}</h2>
        <button
          type="button"
          className="scoring-trace__expand"
          onClick={open}
          aria-haspopup="dialog"
          title={t("a11y.expandScoringTrace")}
        >
          <span aria-hidden="true">⤢ </span>{t("scoringTrace.expand")}
        </button>
      </div>
      <div
        ref={scrollRef}
        className="scoring-trace__scroll"
        role="log"
        aria-live="polite"
        aria-label={t("a11y.scoringTraceLog")}
        tabIndex={0}
      >
        <ScoringTraceContent events={events} />
      </div>
      {isExpanded ? (
        <Suspense fallback={<LazyChunkSpinner variant="overlay" />}>
          <ScoringTraceModal events={events} onClose={close} />
        </Suspense>
      ) : null}
    </section>
  );
}
