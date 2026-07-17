import { useTranslation } from "react-i18next";
import { tHandLabel } from "../../i18n/handLabels";
import {
  formatScoringEvent,
  groupEventsByHand,
  partitionByCategory,
  resolveHandTotals,
  type ScoringEvent,
} from "../../scoring/scoringTrace";
import { formatNumber } from "../../utils/formatNumber";

interface ScoringTraceContentProps {
  readonly events: ReadonlyArray<ScoringEvent>;
  readonly idPrefix?: string;
}

export default function ScoringTraceContent({
  events,
  idPrefix = "scoring-trace",
}: ScoringTraceContentProps) {
  const { t } = useTranslation();
  const groups = groupEventsByHand(events);
  if (groups.length === 0) {
    return <p className="text-muted italic">No scoring yet.</p>;
  }
  return (
    <>
      {groups.map((group) => {
        const key = group.base ? `hand-${group.base.handNumber}` : "pre-hand";
        const headingId = group.base
          ? `${idPrefix}-hand-${group.base.handNumber}`
          : undefined;
        const { scoring, money } = partitionByCategory(group.events);
        const totals = resolveHandTotals(group);
        return (
          <section
            key={key}
            className="border-b border-border py-1 last:border-b-0"
            aria-labelledby={headingId}
          >
            {group.base ? (
              <h3 id={headingId} className="font-bold text-ink">
                {t("scoringTrace.handHeading", {
                  number: group.base.handNumber,
                  hand: tHandLabel(t, group.base.handLabel),
                  level: group.base.level,
                })}{" "}
                <span className="font-normal text-muted">
                  +{formatNumber(group.base.chips)} Chips, +
                  {formatNumber(group.base.mult)} Mult
                </span>
              </h3>
            ) : null}
            {scoring.length > 0 ? (
              <ol className="list-decimal pl-6 marker:text-muted">
                {scoring.map((event, index) => (
                  <li key={index} className="text-muted">
                    {formatScoringEvent(event)}
                  </li>
                ))}
              </ol>
            ) : null}
            {money.length > 0 ? (
              <div className="mt-1">
                <h4 className="font-bold text-money">Money won</h4>
                <ol className="list-decimal pl-6 marker:text-muted">
                  {money.map((event, index) => (
                    <li key={index} className="text-muted">
                      {formatScoringEvent(event)}
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
            {totals ? (
              <p className="mt-1 font-bold text-success">
                {t("scoringTrace.handTotal", {
                  chips: formatNumber(totals.chips),
                  mult: formatNumber(totals.mult),
                  total: formatNumber(totals.total),
                })}
              </p>
            ) : null}
          </section>
        );
      })}
    </>
  );
}
