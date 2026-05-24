import { useMemo, useState } from "react";
import "./Hand.css";
import Card from "./Card";
import DeckPile from "./DeckPile";
import type { Card as CardType } from "../types";
import { createDeck, deal, shuffle, HAND_SIZE } from "../deck";

interface HandProps {
  initialDeck?: ReadonlyArray<CardType>;
}

export default function Hand({ initialDeck }: HandProps) {
  const dealt = useMemo(() => {
    const source = initialDeck ?? shuffle(createDeck());
    return deal(source, HAND_SIZE);
  }, [initialDeck]);

  const [selectedIds, setSelectedIds] = useState<ReadonlySet<number>>(
    () => new Set()
  );

  function toggleCard(card: CardType) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(card.id)) {
        next.delete(card.id);
      } else {
        next.add(card.id);
      }
      return next;
    });
  }

  return (
    <div className="hand">
      <div className="hand-cards" aria-label="Your hand">
        {dealt.hand.map((card) => (
          <Card
            key={card.id}
            card={card}
            selected={selectedIds.has(card.id)}
            onToggle={toggleCard}
          />
        ))}
      </div>
      <div className="hand-deck">
        <DeckPile remaining={dealt.remaining} />
      </div>
    </div>
  );
}
