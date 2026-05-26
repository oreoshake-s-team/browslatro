import {
  formatScoringEvent,
  groupEventsByHand,
  partitionByCategory,
  type ScoringEvent,
} from "../../scoring/scoringTrace";
import "./ScoringTrace.css";

interface ScoringTraceProps {
  readonly events: ReadonlyArray<ScoringEvent>;
}

export default function ScoringTrace({ events }: ScoringTraceProps) {
  const groups = groupEventsByHand(events);
  return (
    <section className="scoring-trace">
      <h2 className="scoring-trace__title">Scoring Trace</h2>
      <div
        className="scoring-trace__scroll"
        role="log"
        aria-live="polite"
        aria-label="Scoring trace"
        tabIndex={0}
      >
        {groups.length === 0 ? (
          <p className="scoring-trace__empty">No scoring yet.</p>
        ) : (
          groups.map((group) => {
            const key = group.base ? `hand-${group.base.handNumber}` : "pre-hand";
            const headingId = group.base
              ? `scoring-trace-hand-${group.base.handNumber}`
              : undefined;
            const { scoring, money } = partitionByCategory(group.events);
            return (
              <section
                key={key}
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
                {scoring.length > 0 ? (
                  <ol className="scoring-trace__list">
                    {scoring.map((event, index) => (
                      <li key={index} className="scoring-trace__item">
                        {formatScoringEvent(event)}
                      </li>
                    ))}
                  </ol>
                ) : null}
                {money.length > 0 ? (
                  <div className="scoring-trace__money">
                    <h4 className="scoring-trace__money-heading">Money won</h4>
                    <ol className="scoring-trace__list scoring-trace__list--money">
                      {money.map((event, index) => (
                        <li key={index} className="scoring-trace__item">
                          {formatScoringEvent(event)}
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : null}
              </section>
            );
          })
        )}
      </div>
    </section>
  );
}
