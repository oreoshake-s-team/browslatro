import { useTranslation } from "react-i18next";
import "./DeckSummary.css";
import type { Card, Suit } from "../../cards/types";
import { RANKS, SUITS, summarizeDeck } from "../../cards/deck";

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
      className="deck-summary"
      aria-label={t("a11y.remainingCardsSummary")}
      data-testid="deck-summary"
    >
      <div className="deck-summary-section deck-summary-section-suits">
        <h4 className="deck-summary-heading">{t("cardPiles.bySuit")}</h4>
        <ul className="deck-summary-list">
          {SUITS.map((suit) => (
            <li
              key={suit}
              className="deck-summary-row"
              data-testid={`deck-summary-suit-${suit}`}
            >
              <span className="deck-summary-count">{suitCounts[suit]}</span>
              <span className="deck-summary-name">
                <span
                  className={`deck-summary-glyph deck-summary-glyph-${suit}`}
                  aria-hidden="true"
                >
                  {SUIT_GLYPHS[suit]}
                </span>
                <span className="deck-summary-label">{t(`suits.${suit}`)}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="deck-summary-section deck-summary-section-ranks">
        <h4 className="deck-summary-heading">{t("cardPiles.byRank")}</h4>
        <ul className="deck-summary-list">
          {RANKS_DESC.map((rank) => (
            <li
              key={rank}
              className="deck-summary-row"
              data-testid={`deck-summary-rank-${rank}`}
            >
              <span className="deck-summary-count">{rankCounts[rank]}</span>
              <span className="deck-summary-label">{rank}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
