import { useMemo, useState } from "react";
import "./Hand.css";
import Card from "./Card";
import DeckPile from "./DeckPile";
import type { Card as CardType } from "../types";
import { createDeck, deal, shuffle, HAND_SIZE } from "../deck";

export const MAX_SELECTED = 5;

interface HandProps {
  initialDeck?: ReadonlyArray<CardType>;
  onSelectionChange?: (selectedCards: ReadonlyArray<CardType>) => void;
}

export default function Hand({ initialDeck, onSelectionChange }: HandProps) {
  const dealt = useMemo(() => {
    const source = initialDeck ?? shuffle(createDeck());
    return deal(source, HAND_SIZE);
  }, [initialDeck]);

  const [selectedIds, setSelectedIds] = useState<ReadonlySet<number>>(
    () => new Set()
  );

  function toggleCard(card: CardType) {
    let nextIds: Set<number>;
    if (selectedIds.has(card.id)) {
      nextIds = new Set(selectedIds);
      nextIds.delete(card.id);
    } else {
      if (selectedIds.size >= MAX_SELECTED) {
        return;
      }
      nextIds = new Set(selectedIds);
      nextIds.add(card.id);
    }
    setSelectedIds(nextIds);
    if (onSelectionChange) {
      onSelectionChange(dealt.hand.filter((c) => nextIds.has(c.id)));
    }
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
