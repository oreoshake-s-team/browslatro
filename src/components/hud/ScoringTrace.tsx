import { useCallback, useState } from "react";
import type { ScoringEvent } from "../../scoring/scoringTrace";
import ScoringTraceContent from "./ScoringTraceContent";
import ScoringTraceModal from "./ScoringTraceModal";
import "./ScoringTrace.css";

interface ScoringTraceProps {
  readonly events: ReadonlyArray<ScoringEvent>;
}

export default function ScoringTrace({ events }: ScoringTraceProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const open = useCallback(() => setIsExpanded(true), []);
  const close = useCallback(() => setIsExpanded(false), []);
  return (
    <section className="scoring-trace">
      <div className="scoring-trace__header">
        <h2 className="scoring-trace__title">Scoring Trace</h2>
        <button
          type="button"
          className="scoring-trace__expand"
          onClick={open}
          aria-haspopup="dialog"
          aria-label="Expand scoring trace to full screen"
        >
          ⤢ Expand
        </button>
      </div>
      <div
        className="scoring-trace__scroll"
        role="log"
        aria-live="polite"
        aria-label="Scoring trace"
        tabIndex={0}
      >
        <ScoringTraceContent events={events} />
      </div>
      {isExpanded ? (
        <ScoringTraceModal events={events} onClose={close} />
      ) : null}
    </section>
  );
}
