import {
  formatScoringEvent,
  groupEventsByHand,
  type ScoringEvent,
} from "../../scoring/scoringTrace";
import "./ScoringTrace.css";

interface ScoringTraceProps {
  readonly events: ReadonlyArray<ScoringEvent>;
}

export default function ScoringTrace({ events }: ScoringTraceProps) {
  const groups = groupEventsByHand(events);
  return (
    <aside
      className="scoring-trace"
      role="log"
      aria-live="polite"
      aria-label="Scoring trace"
    >
      <h2 className="scoring-trace__title">Scoring Trace</h2>
      {groups.length === 0 ? (
        <p className="scoring-trace__empty">No scoring yet.</p>
      ) : (
        groups.map((group) => {
          const headingId = group.base
            ? `scoring-trace-hand-${group.base.handNumber}`
            : undefined;
          return (
            <section
              key={group.base ? group.base.handNumber : "pre-hand"}
              className="scoring-trace__group"
              aria-labelledby={headingId}
            >
              {group.base ? (
                <h3 id={headingId} className="scoring-trace__group-heading">
                  Hand {group.base.handNumber}: {group.base.handLabel} (Lv {group.base.level})
                  {" "}
                  <span className="scoring-trace__group-base">
                    +{group.base.chips} Chips, +{group.base.mult} Mult
                  </span>
                </h3>
              ) : null}
              {group.events.length > 0 ? (
                <ol className="scoring-trace__list">
                  {group.events.map((event, index) => (
                    <li key={index} className="scoring-trace__item">
                      {formatScoringEvent(event)}
                    </li>
                  ))}
                </ol>
              ) : null}
            </section>
          );
        })
      )}
    </aside>
  );
}
