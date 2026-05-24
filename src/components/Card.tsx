import "./Card.css";
import type { Card as CardType, Suit } from "../types";

const SUIT_GLYPHS: Record<Suit, string> = {
  spades: "♠",
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
};

const SUIT_LABELS: Record<Suit, string> = {
  spades: "Spades",
  hearts: "Hearts",
  diamonds: "Diamonds",
  clubs: "Clubs",
};

interface CardProps {
  card: CardType;
  selected?: boolean;
  onToggle?: (card: CardType) => void;
}

export default function Card({ card, selected = false, onToggle }: CardProps) {
  const colorClass =
    card.suit === "hearts" || card.suit === "diamonds"
      ? "card-red"
      : "card-black";
  const selectedClass = selected ? "card-selected" : "";
  const ariaLabel = `${card.rank} of ${SUIT_LABELS[card.suit]}`;

  return (
    <button
      type="button"
      className={`card ${colorClass} ${selectedClass}`.trim()}
      aria-pressed={selected}
      aria-label={ariaLabel}
      onClick={() => onToggle?.(card)}
    >
      <span className="card-corner card-corner-top">
        <span className="card-rank">{card.rank}</span>
        <span className="card-suit">{SUIT_GLYPHS[card.suit]}</span>
      </span>
      <span className="card-center" aria-hidden="true">
        {SUIT_GLYPHS[card.suit]}
      </span>
      <span className="card-corner card-corner-bottom">
        <span className="card-rank">{card.rank}</span>
        <span className="card-suit">{SUIT_GLYPHS[card.suit]}</span>
      </span>
    </button>
  );
}
