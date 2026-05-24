import "./Hand.css";
import Card from "./Card";
import DeckPile from "./DeckPile";
import type { Card as CardType } from "../types";

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
  return (
    <div className="hand">
      <div className="hand-cards" aria-label="Your hand">
        {hand.map((card) => (
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
  );
}
