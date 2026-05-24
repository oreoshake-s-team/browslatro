import "./Card.css";
import type { Card as CardType, Rank, Suit } from "../types";

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

type FaceRank = "J" | "Q" | "K";

const FACE_RANK_CLASS: Record<FaceRank, string> = {
  J: "card-face-jack",
  Q: "card-face-queen",
  K: "card-face-king",
};

// Decorative glyph paired with each face card. Jack gets a scepter (no crown),
// Queen wears the white chess queen crown, King wears the heavier black chess
// king crown — all standard Unicode so we stay dependency-free.
const FACE_RANK_GLYPH: Record<FaceRank, string> = {
  J: "⚜",
  Q: "♛",
  K: "♚",
};

function isFaceRank(rank: Rank): rank is FaceRank {
  return rank === "J" || rank === "Q" || rank === "K";
}

interface CardProps {
  card: CardType;
  selected?: boolean;
  discarding?: boolean;
  scoring?: boolean;
  onToggle?: (card: CardType) => void;
  onDiscardEnd?: (card: CardType) => void;
}

export default function Card({
  card,
  selected = false,
  discarding = false,
  scoring = false,
  onToggle,
  onDiscardEnd,
}: CardProps) {
  const colorClass =
    card.suit === "hearts" || card.suit === "diamonds"
      ? "card-red"
      : "card-black";
  const suitClass = `card-suit-${card.suit}`;
  const selectedClass = selected ? "card-selected" : "";
  const discardingClass = discarding ? "card-discarding" : "";
  const scoringClass = scoring ? "card-scoring" : "";
  const ariaLabel = `${card.rank} of ${SUIT_LABELS[card.suit]}`;
  const faceClass = isFaceRank(card.rank)
    ? `card-face ${FACE_RANK_CLASS[card.rank]}`
    : "";

  return (
    <button
      type="button"
      className={`card ${colorClass} ${suitClass} ${selectedClass} ${discardingClass} ${scoringClass} ${faceClass}`
        .replace(/\s+/g, " ")
        .trim()}
      aria-pressed={selected}
      aria-label={ariaLabel}
      onClick={() => onToggle?.(card)}
      onAnimationEnd={() => {
        if (discarding) {
          onDiscardEnd?.(card);
        }
      }}
    >
      <span className="card-corner card-corner-top">
        <span className="card-rank">{card.rank}</span>
        <span className="card-suit">{SUIT_GLYPHS[card.suit]}</span>
      </span>
      {isFaceRank(card.rank) ? (
        <span className="card-face-decoration" aria-hidden="true">
          <span className="card-face-glyph">{FACE_RANK_GLYPH[card.rank]}</span>
          <span className="card-face-monogram">{card.rank}</span>
          <span className="card-face-suit">{SUIT_GLYPHS[card.suit]}</span>
        </span>
      ) : (
        <span className="card-center" aria-hidden="true">
          {SUIT_GLYPHS[card.suit]}
        </span>
      )}
      <span className="card-corner card-corner-bottom">
        <span className="card-rank">{card.rank}</span>
        <span className="card-suit">{SUIT_GLYPHS[card.suit]}</span>
      </span>
    </button>
  );
}
