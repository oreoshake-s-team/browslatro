import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { ScoringEvent } from "../../scoring/scoringTrace";
import ScoringTraceContent from "./ScoringTraceContent";
import ScoringTraceButton from "./ScoringTraceButton";
import { Panel } from "../ui/Panel";

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
    <Panel
      tone="sunken"
      pad="sm"
      className="flex min-h-48 flex-1 flex-col font-mono text-xs portrait-narrow:hidden"
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <h2 className="font-bold tracking-widest text-money uppercase">
          {t("scoringTrace.title")}
        </h2>
        <ScoringTraceButton
          events={events}
          className="cursor-pointer rounded-md border border-border px-2 py-0.5 text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          <span aria-hidden="true">⤢ </span>
          {t("scoringTrace.expand")}
        </ScoringTraceButton>
      </div>
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto focus-visible:outline-2 focus-visible:outline-focus"
        role="log"
        aria-live="polite"
        aria-label={t("a11y.scoringTraceLog")}
        tabIndex={0}
      >
        <ScoringTraceContent events={events} />
      </div>
    </Panel>
  );
}
