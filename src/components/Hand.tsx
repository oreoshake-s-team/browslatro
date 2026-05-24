import { useMemo, useState } from "react";
import "./Hand.css";
import Card from "./Card";
import DeckPile from "./DeckPile";
import type { Card as CardType, Suit } from "../types";
import { sortCards, type SortMode } from "../deck";

export const MAX_SELECTED = 5;

const SUIT_LABELS: Record<Suit, string> = {
  spades: "Spades",
  hearts: "Hearts",
  diamonds: "Diamonds",
  clubs: "Clubs",
};

function cardLabel(card: CardType): string {
  return `${card.rank} of ${SUIT_LABELS[card.suit]}`;
}

function applyManualOrder(
  hand: ReadonlyArray<CardType>,
  order: ReadonlyArray<number>,
): CardType[] {
  const byId = new Map(hand.map((c) => [c.id, c]));
  const result: CardType[] = [];
  for (const id of order) {
    const card = byId.get(id);
    if (card) {
      result.push(card);
      byId.delete(id);
    }
  }
  // Append any cards that weren't in the manual order yet (newly drawn).
  byId.forEach((card) => {
    result.push(card);
  });
  return result;
}

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
  const [manualOrder, setManualOrder] = useState<ReadonlyArray<number> | null>(
    null,
  );

  const displayedHand = useMemo(
    () =>
      manualOrder ? applyManualOrder(hand, manualOrder) : sortCards(hand, sortMode),
    [hand, sortMode, manualOrder],
  );

  function selectSort(mode: SortMode) {
    setSortMode(mode);
    setManualOrder(null);
  }

  function moveCard(cardId: number, direction: -1 | 1) {
    const currentOrder = displayedHand.map((c) => c.id);
    const idx = currentOrder.indexOf(cardId);
    if (idx < 0) return;
    const target = idx + direction;
    if (target < 0 || target >= currentOrder.length) return;
    const next = currentOrder.slice();
    [next[idx], next[target]] = [next[target], next[idx]];
    setManualOrder(next);
  }

  return (
    <div className="hand">
      <div className="hand-toolbar">
        <span className="hand-sort-label">Sort:</span>
        <div className="hand-sort-group" role="group" aria-label="Sort hand">
          <button
            type="button"
            className={`hand-sort-button ${
              !manualOrder && sortMode === "rank"
                ? "hand-sort-button-active"
                : ""
            }`.trim()}
            aria-pressed={!manualOrder && sortMode === "rank"}
            onClick={() => selectSort("rank")}
          >
            Rank
          </button>
          <button
            type="button"
            className={`hand-sort-button ${
              !manualOrder && sortMode === "suit"
                ? "hand-sort-button-active"
                : ""
            }`.trim()}
            aria-pressed={!manualOrder && sortMode === "suit"}
            onClick={() => selectSort("suit")}
          >
            Suit
          </button>
          <button
            type="button"
            className={`hand-sort-button ${
              manualOrder ? "hand-sort-button-active" : ""
            }`.trim()}
            aria-pressed={Boolean(manualOrder)}
            disabled={!manualOrder}
            aria-label="Manual order"
            title="Manual order (use the arrows on each card to rearrange)"
          >
            Manual
          </button>
        </div>
      </div>
      <div className="hand-row">
        <div className="hand-cards" aria-label="Your hand">
          {displayedHand.map((card, idx) => (
            <div key={card.id} className="hand-card-slot">
              <Card
                card={card}
                selected={selectedIds.has(card.id)}
                discarding={discardingIds.has(card.id)}
                onToggle={onToggleCard}
                onDiscardEnd={onCardDiscardEnd}
              />
              <div
                className="hand-card-reorder"
                role="group"
                aria-label={`Reorder ${cardLabel(card)}`}
              >
                <button
                  type="button"
                  className="hand-card-reorder-button"
                  aria-label={`Move ${cardLabel(card)} left`}
                  disabled={idx === 0}
                  onClick={() => moveCard(card.id, -1)}
                >
                  ◀
                </button>
                <button
                  type="button"
                  className="hand-card-reorder-button"
                  aria-label={`Move ${cardLabel(card)} right`}
                  disabled={idx === displayedHand.length - 1}
                  onClick={() => moveCard(card.id, 1)}
                >
                  ▶
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="hand-deck">
          <DeckPile remaining={remaining} />
        </div>
      </div>
    </div>
  );
}
