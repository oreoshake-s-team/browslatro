import {
  formatScoringEvent,
  groupEventsByHand,
  partitionByCategory,
  type ScoringEvent,
} from "../../scoring/scoringTrace";

interface ScoringTraceContentProps {
  readonly events: ReadonlyArray<ScoringEvent>;
  readonly idPrefix?: string;
}

export default function ScoringTraceContent({
  events,
  idPrefix = "scoring-trace",
}: ScoringTraceContentProps) {
  const groups = groupEventsByHand(events);
  if (groups.length === 0) {
    return <p className="scoring-trace__empty">No scoring yet.</p>;
  }
  return (
    <>
      {groups.map((group) => {
        const key = group.base ? `hand-${group.base.handNumber}` : "pre-hand";
        const headingId = group.base
          ? `${idPrefix}-hand-${group.base.handNumber}`
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
      })}
    </>
  );
}
