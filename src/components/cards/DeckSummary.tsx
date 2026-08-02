import { useTranslation } from "react-i18next";
import type { Card, Suit } from "../../cards/types";
import { RANKS, SUITS, summarizeDeck } from "../../cards/deck";
import { cn } from "../ui/cn";

const SUIT_GLYPHS: Record<Suit, string> = {
  spades: "♠",
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
};

const RANKS_DESC = [...RANKS].reverse();

interface DeckSummaryProps {
  remaining: ReadonlyArray<Card>;
}

export default function DeckSummary({ remaining }: DeckSummaryProps) {
  const { t } = useTranslation();
  const { suitCounts, rankCounts } = summarizeDeck(remaining);
  return (
    <section
      className="flex w-30 shrink-0 flex-col gap-3 border-r border-border pr-3"
      aria-label={t("a11y.remainingCardsSummary")}
      data-testid="deck-summary"
    >
      <div
        className="flex flex-4 flex-col gap-1"
        data-testid="deck-summary-suits"
      >
        <h4
          className="text-xs font-semibold tracking-wide text-muted uppercase"
          data-testid="deck-summary-heading"
        >
          {t("cardPiles.bySuit")}
        </h4>
        <ul className="flex flex-1 list-none flex-col divide-y divide-border overflow-hidden rounded border border-border">
          {SUITS.map((suit) => (
            <li
              key={suit}
              className="flex min-h-4 flex-1 items-center justify-between gap-1 px-1.5 text-xs odd:bg-raised"
              data-testid={`deck-summary-suit-${suit}`}
            >
              <span
                className="min-w-4 text-right font-bold text-ink tabular-nums"
                data-testid="deck-summary-count"
              >
                {suitCounts[suit]}
              </span>
              <span className="flex items-center gap-1">
                <span
                  className={cn(
                    "w-2.5 text-center",
                    suit === "hearts" || suit === "diamonds"
                      ? "text-mult"
                      : "text-ink",
                  )}
                  aria-hidden="true"
                >
                  {SUIT_GLYPHS[suit]}
                </span>
                <span>{t(`suits.${suit}`)}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div
        className="flex flex-13 flex-col gap-1"
        data-testid="deck-summary-ranks"
      >
        <h4
          className="text-xs font-semibold tracking-wide text-muted uppercase"
          data-testid="deck-summary-heading"
        >
          {t("cardPiles.byRank")}
        </h4>
        <ul className="flex flex-1 list-none flex-col divide-y divide-border overflow-hidden rounded border border-border">
          {RANKS_DESC.map((rank) => (
            <li
              key={rank}
              className="flex min-h-4 flex-1 items-center justify-between gap-1 px-1.5 text-xs odd:bg-raised"
              data-testid={`deck-summary-rank-${rank}`}
            >
              <span
                className="min-w-4 text-right font-bold text-ink tabular-nums"
                data-testid="deck-summary-count"
              >
                {rankCounts[rank]}
              </span>
              <span>{rank}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
