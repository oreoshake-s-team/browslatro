import { useMemo, useState } from "react";
import "./Hand.css";
import Card from "./Card";
import DeckPile from "./DeckPile";
import type { Card as CardType } from "../types";
import { sortCards, type SortMode } from "../deck";

export const MAX_SELECTED = 5;

interface HandProps {
  hand: ReadonlyArray<CardType>;
  remaining: ReadonlyArray<CardType>;
  selectedIds: ReadonlySet<number>;
  discardingIds: ReadonlySet<number>;
  onToggleCard: (card: CardType) => void;
  onCardDiscardEnd: (card: CardType) => void;
}

export default function Hand({
  hand,
  remaining,
  selectedIds,
  discardingIds,
  onToggleCard,
  onCardDiscardEnd,
}: HandProps) {
  const [sortMode, setSortMode] = useState<SortMode>("rank");

  const displayedHand = useMemo(
    () => sortCards(hand, sortMode),
    [hand, sortMode],
  );

  return (
    <div className="hand">
      <div className="hand-toolbar">
        <span className="hand-sort-label">Sort:</span>
        <div className="hand-sort-group" role="group" aria-label="Sort hand">
          <button
            type="button"
            className={`hand-sort-button ${
              sortMode === "rank" ? "hand-sort-button-active" : ""
            }`.trim()}
            aria-pressed={sortMode === "rank"}
            onClick={() => setSortMode("rank")}
          >
            Rank
          </button>
          <button
            type="button"
            className={`hand-sort-button ${
              sortMode === "suit" ? "hand-sort-button-active" : ""
            }`.trim()}
            aria-pressed={sortMode === "suit"}
            onClick={() => setSortMode("suit")}
          >
            Suit
          </button>
        </div>
      </div>
      <div className="hand-row">
        <div className="hand-cards" aria-label="Your hand">
          {displayedHand.map((card) => (
            <Card
              key={card.id}
              card={card}
              selected={selectedIds.has(card.id)}
              discarding={discardingIds.has(card.id)}
              onToggle={onToggleCard}
              onDiscardEnd={onCardDiscardEnd}
            />
          ))}
        </div>
        <div className="hand-deck">
          <DeckPile remaining={remaining} />
        </div>
      </div>
    </div>
  );
}
