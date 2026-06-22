import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { ScoringEvent } from "../../scoring/scoringTrace";
import ScoringTraceContent from "./ScoringTraceContent";
import ScoringTraceButton from "./ScoringTraceButton";
import "./ScoringTrace.css";

interface ScoringTraceProps {
  readonly events: ReadonlyArray<ScoringEvent>;
}

export default function ScoringTrace({ events }: ScoringTraceProps) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [events]);
  return (
    <section className="scoring-trace">
      <div className="scoring-trace__header">
        <h2 className="scoring-trace__title">{t("scoringTrace.title")}</h2>
        <ScoringTraceButton events={events} className="scoring-trace__expand">
          <span aria-hidden="true">⤢ </span>{t("scoringTrace.expand")}
        </ScoringTraceButton>
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
    </section>
  );
}
