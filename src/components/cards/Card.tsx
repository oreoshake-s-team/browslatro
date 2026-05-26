import "./Card.css";
import { useEffect, useId, useRef, useState } from "react";
import type { Card as CardType, Enhancement, Rank, Suit } from "../../cards/types";
import { getSealInfo } from "../../cards/seals";
import CardTooltip from "./CardTooltip";
import { getCardInfo } from "./cardInfo";

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

const ENHANCEMENT_LABEL: Record<Enhancement, string> = {
  bonus: "Bonus",
  mult: "Mult",
  wild: "Wild",
  glass: "Glass",
  steel: "Steel",
  stone: "Stone",
  gold: "Gold",
  lucky: "Lucky",
};

function isFaceRank(rank: Rank): rank is FaceRank {
  return rank === "J" || rank === "Q" || rank === "K";
}

interface CardProps {
  card: CardType;
  selected?: boolean;
  discarding?: boolean;
  scoring?: boolean;
  goldScoring?: boolean;
  steelScoring?: boolean;
  onToggle?: (card: CardType) => void;
  onDiscardEnd?: (card: CardType) => void;
}

export default function Card({
  card,
  selected = false,
  discarding = false,
  scoring = false,
  goldScoring = false,
  steelScoring = false,
  onToggle,
  onDiscardEnd,
}: CardProps) {
  const tooltipId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [tooltipRect, setTooltipRect] = useState<DOMRect | null>(null);
  const showTooltip = () => {
    const el = buttonRef.current;
    if (el) setTooltipRect(el.getBoundingClientRect());
  };
  const hideTooltip = () => setTooltipRect(null);
  useEffect(() => {
    if (!tooltipRect) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setTooltipRect(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tooltipRect]);
  const isStone = card.enhancement === "stone";
  const colorClass = isStone
    ? "card-stone-text"
    : card.suit === "hearts" || card.suit === "diamonds"
      ? "card-red"
      : "card-black";
  const suitClass = `card-suit-${card.suit}`;
  const selectedClass = selected ? "card-selected" : "";
  const discardingClass = discarding ? "card-discarding" : "";
  const scoringClass = scoring ? "card-scoring" : "";
  const goldScoringClass = goldScoring ? "card-gold-scoring" : "";
  const steelScoringClass = steelScoring ? "card-steel-scoring" : "";
  const enhancementClass = card.enhancement
    ? `card-enhancement-${card.enhancement}`
    : "";
  const sealClass = card.seal ? `card-seal-${card.seal}` : "";
  const baseName = isStone
    ? "Stone card"
    : card.enhancement
      ? `${card.rank} of ${SUIT_LABELS[card.suit]} (${ENHANCEMENT_LABEL[card.enhancement]})`
      : `${card.rank} of ${SUIT_LABELS[card.suit]}`;
  const ariaLabel = card.seal ? `${baseName}, ${getSealInfo(card.seal).name}` : baseName;
  const faceClass = !isStone && isFaceRank(card.rank)
    ? `card-face ${FACE_RANK_CLASS[card.rank]}`
    : "";

  return (
    <button
      ref={buttonRef}
      type="button"
      className={`card ${colorClass} ${suitClass} ${selectedClass} ${discardingClass} ${scoringClass} ${goldScoringClass} ${steelScoringClass} ${faceClass} ${enhancementClass} ${sealClass}`
        .replace(/\s+/g, " ")
        .trim()}
      aria-pressed={selected}
      aria-label={ariaLabel}
      aria-describedby={tooltipRect ? tooltipId : undefined}
      data-testid={steelScoring ? `steel-scoring-${card.id}` : undefined}
      onClick={() => onToggle?.(card)}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
      onAnimationEnd={() => {
        if (discarding) {
          onDiscardEnd?.(card);
        }
      }}
    >
      {isStone ? (
        <span className="card-stone-face" aria-hidden="true" />
      ) : (
        <>
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
        </>
      )}
      {card.seal && (
        <span
          className={`card-seal card-seal-badge-${card.seal}`}
          aria-hidden="true"
          data-testid={`card-seal-${card.id}`}
        />
      )}
      {tooltipRect && (
        <CardTooltip id={tooltipId} info={getCardInfo(card)} anchorRect={tooltipRect} />
      )}
    </button>
  );
}
