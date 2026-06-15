import "./Card.css";
import "./CardCenterValue.css";
import "./CardLuckyCenter.css";
import "./CardEditions.css";
import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Card as CardType, CardEdition, Enhancement, Rank, Seal, Suit } from "../../cards/types";
import { tSuitName } from "../../i18n/strings";
import {
  enhancementDisplayValue,
  type EnhancementValueColor,
  type EnhancementValueTiming,
} from "../../cards/enhancementDisplay";
import {
  LUCKY_ENHANCEMENT_MONEY_AMOUNT,
  LUCKY_ENHANCEMENT_MONEY_CHANCE,
  LUCKY_ENHANCEMENT_MULT_AMOUNT,
  LUCKY_ENHANCEMENT_MULT_CHANCE,
} from "../../cards/enhancements";
import CardTooltip from "./CardTooltip";
import { getCardInfo } from "./cardInfo";
import { useGame } from "../../store/game";
import { probabilityMultiplierFromJokers } from "../../items/jokers";

const SUIT_GLYPHS: Record<Suit, string> = {
  spades: "♠",
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
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

const ENHANCEMENT_LABEL_KEY = {
  bonus: "cardLabels.enhancementBonus",
  mult: "cardLabels.enhancementMult",
  wild: "cardLabels.enhancementWild",
  glass: "cardLabels.enhancementGlass",
  steel: "cardLabels.enhancementSteel",
  stone: "cardLabels.enhancementStone",
  gold: "cardLabels.enhancementGold",
  lucky: "cardLabels.enhancementLucky",
} as const satisfies Record<Enhancement, string>;

const ENHANCEMENT_VALUE_LABEL_KEY = {
  chips: "a11y.enhancementValueChips",
  mult: "a11y.enhancementValueMult",
  money: "a11y.enhancementValueMoney",
} as const satisfies Record<EnhancementValueColor, string>;

const ENHANCEMENT_VALUE_TIMING_LABEL_KEY = {
  heldInHand: "a11y.enhancementValueHeldInHand",
  heldAtEndOfRound: "a11y.enhancementValueHeldAtEndOfRound",
} as const satisfies Record<Exclude<EnhancementValueTiming, "scored">, string>;

const ENHANCEMENT_VALUE_TIMING_CAPTION_KEY = {
  heldInHand: "cardLabels.valueInHand",
  heldAtEndOfRound: "cardLabels.valueIfHeld",
} as const satisfies Record<Exclude<EnhancementValueTiming, "scored">, string>;

const SEAL_LABEL_KEY = {
  gold: "cardLabels.sealGold",
  red: "cardLabels.sealRed",
  blue: "cardLabels.sealBlue",
  purple: "cardLabels.sealPurple",
} as const satisfies Record<Seal, string>;

const CARD_EDITION_LABEL_KEY = {
  foil: "cardLabels.editionFoil",
  holographic: "cardLabels.editionHolographic",
  polychrome: "cardLabels.editionPolychrome",
} as const satisfies Record<CardEdition, string>;

function isFaceRank(rank: Rank): rank is FaceRank {
  return rank === "J" || rank === "Q" || rank === "K";
}

interface CardProps {
  card: CardType;
  selected?: boolean;
  forced?: boolean;
  discarding?: boolean;
  newlyDrawn?: boolean;
  debuffed?: boolean;
  scoring?: boolean;
  scoringPulseTick?: number;
  goldScoring?: boolean;
  steelScoring?: boolean;
  luckyMultScoring?: boolean;
  luckyMoneyScoring?: boolean;
  onToggle?: (card: CardType) => void;
  onDiscardEnd?: (card: CardType) => void;
  decorative?: boolean;
}

export default function Card({
  card,
  selected = false,
  forced = false,
  discarding = false,
  newlyDrawn = false,
  debuffed = false,
  scoring = false,
  scoringPulseTick = 0,
  goldScoring = false,
  steelScoring = false,
  luckyMultScoring = false,
  luckyMoneyScoring = false,
  onToggle,
  onDiscardEnd,
  decorative = false,
}: CardProps) {
  const { t } = useTranslation();
  const tooltipId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [tooltipRect, setTooltipRect] = useState<DOMRect | null>(null);
  const probabilityMultiplier = useGame((s) =>
    probabilityMultiplierFromJokers(s.jokers),
  );
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
  const newlyDrawnClass = newlyDrawn ? "card-newly-drawn" : "";
  const scoringClass = scoring
    ? `card-scoring card-scoring-tick-${scoringPulseTick % 2}`
    : "";
  const goldScoringClass = goldScoring ? "card-gold-scoring" : "";
  const steelScoringClass = steelScoring ? "card-steel-scoring" : "";
  const luckyMultScoringClass = luckyMultScoring ? "card-lucky-mult-scoring" : "";
  const luckyMoneyScoringClass = luckyMoneyScoring
    ? "card-lucky-money-scoring"
    : "";
  const showBack = card.faceDown === true && !scoring;
  const enhancementClass = !showBack && card.enhancement
    ? `card-enhancement-${card.enhancement}`
    : "";
  const sealClass = !showBack && card.seal ? `card-seal-${card.seal}` : "";
  const editionClass = !showBack && card.edition
    ? `card-edition-${card.edition}`
    : "";
  const debuffedClass = debuffed ? "card-debuffed" : "";
  const displayValue = card.enhancement
    ? enhancementDisplayValue(card.enhancement)
    : null;
  const isLucky = card.enhancement === "lucky";
  const luckyMultDenom = Math.round(1 / LUCKY_ENHANCEMENT_MULT_CHANCE);
  const luckyMoneyDenom = Math.round(1 / LUCKY_ENHANCEMENT_MONEY_CHANCE);
  const valueText = displayValue
    ? displayValue.timing === "scored"
      ? t(ENHANCEMENT_VALUE_LABEL_KEY[displayValue.color], {
          value: displayValue.text,
        })
      : t(ENHANCEMENT_VALUE_TIMING_LABEL_KEY[displayValue.timing], {
          value: t(ENHANCEMENT_VALUE_LABEL_KEY[displayValue.color], {
            value: displayValue.text,
          }),
        })
    : isLucky
      ? t("a11y.enhancementValueLucky", {
          multOdds: t("cardLabels.luckyOdds", { n: luckyMultDenom }),
          mult: LUCKY_ENHANCEMENT_MULT_AMOUNT,
          moneyOdds: t("cardLabels.luckyOdds", { n: luckyMoneyDenom }),
          money: LUCKY_ENHANCEMENT_MONEY_AMOUNT,
        })
      : null;
  const baseName = isStone
    ? t("a11y.stoneCard")
    : card.enhancement
      ? valueText
        ? t("a11y.cardNameEnhancedValue", {
            rank: card.rank,
            suit: tSuitName(t, card.suit),
            enhancement: t(ENHANCEMENT_LABEL_KEY[card.enhancement]),
            value: valueText,
          })
        : t("a11y.cardNameEnhanced", {
            rank: card.rank,
            suit: tSuitName(t, card.suit),
            enhancement: t(ENHANCEMENT_LABEL_KEY[card.enhancement]),
          })
      : t("a11y.cardName", { rank: card.rank, suit: tSuitName(t, card.suit) });
  const withSeal = card.seal
    ? t("a11y.cardWithDetail", {
        name: baseName,
        detail: t(SEAL_LABEL_KEY[card.seal]),
      })
    : baseName;
  const withEdition = card.edition
    ? t("a11y.cardWithDetail", {
        name: withSeal,
        detail: t(CARD_EDITION_LABEL_KEY[card.edition]),
      })
    : withSeal;
  const withDebuff = debuffed
    ? t("a11y.cardDebuffed", { name: withEdition })
    : withEdition;
  const withForced = forced
    ? t("a11y.cardForced", { name: withDebuff })
    : withDebuff;
  const ariaLabel = showBack
    ? t("a11y.faceDownCard")
    : newlyDrawn
      ? t("a11y.cardNewlyDrawn", { name: withForced })
      : withForced;
  const faceClass = !isStone && isFaceRank(card.rank)
    ? `card-face ${FACE_RANK_CLASS[card.rank]}`
    : "";
  const faceDownClass = showBack ? "card-face-down" : "";
  const forcedClass = forced ? "card-forced" : "";

  const cardClassName =
    `card ${colorClass} ${suitClass} ${selectedClass} ${discardingClass} ${newlyDrawnClass} ${scoringClass} ${goldScoringClass} ${steelScoringClass} ${luckyMultScoringClass} ${luckyMoneyScoringClass} ${faceClass} ${enhancementClass} ${sealClass} ${editionClass} ${debuffedClass} ${faceDownClass} ${forcedClass}`
      .replace(/\s+/g, " ")
      .trim();
  const content = (
    <>
      {showBack ? (
        <span
          className="card-back-face"
          aria-hidden="true"
          data-testid={`card-back-${card.id}`}
        />
      ) : isStone ? (
        <span className="card-stone-face" aria-hidden="true" />
      ) : (
        <>
          <span className="card-corner card-corner-top" aria-hidden="true">
            <span className="card-rank">{card.rank}</span>
            <span className="card-suit">{SUIT_GLYPHS[card.suit]}</span>
          </span>
          {isLucky ? (
            <span
              className="card-center-lucky"
              aria-hidden="true"
              data-testid={`card-center-lucky-${card.id}`}
            >
              <span className="card-center-lucky-odds card-center-lucky-odds-mult">
                {t("cardLabels.luckyOddsMult", {
                  n: luckyMultDenom,
                  amount: LUCKY_ENHANCEMENT_MULT_AMOUNT,
                })}
              </span>
              <span className="card-center-lucky-odds card-center-lucky-odds-money">
                {t("cardLabels.luckyOddsMoney", {
                  n: luckyMoneyDenom,
                  amount: LUCKY_ENHANCEMENT_MONEY_AMOUNT,
                })}
              </span>
            </span>
          ) : displayValue ? (
            <span
              className={`card-center-value card-center-value-${displayValue.color}`}
              aria-hidden="true"
              data-testid={`card-center-value-${card.id}`}
            >
              {displayValue.text}
              {displayValue.timing !== "scored" && (
                <span className="card-center-value-timing">
                  {t(ENHANCEMENT_VALUE_TIMING_CAPTION_KEY[displayValue.timing])}
                </span>
              )}
            </span>
          ) : isFaceRank(card.rank) ? (
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
        </>
      )}
      {card.seal && !showBack && (
        <span
          className={`card-seal card-seal-badge-${card.seal}`}
          aria-hidden="true"
          data-testid={`card-seal-${card.id}`}
        />
      )}
      {forced && !showBack && (
        <span
          className="card-forced-badge"
          aria-hidden="true"
          data-testid={`card-forced-${card.id}`}
        >
          🔒
        </span>
      )}
      {luckyMultScoring && (
        <span
          className="card-lucky-mult-badge"
          aria-hidden="true"
          data-testid={`lucky-mult-scoring-${card.id}`}
        >
          +20
        </span>
      )}
      {luckyMoneyScoring && (
        <span
          className="card-lucky-money-badge"
          aria-hidden="true"
          data-testid={`lucky-money-scoring-${card.id}`}
        >
          +$20
        </span>
      )}
    </>
  );
  if (decorative) {
    return (
      <span
        className={cardClassName}
        data-edition={showBack ? undefined : (card.edition ?? undefined)}
        aria-hidden="true"
      >
        {content}
      </span>
    );
  }
  return (
    <button
      ref={buttonRef}
      type="button"
      className={cardClassName}
      data-edition={showBack ? undefined : (card.edition ?? undefined)}
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
      {content}
      {tooltipRect && !showBack && (
        <CardTooltip
          id={tooltipId}
          info={getCardInfo(card, {
            probabilityMultiplier,
            suitLabel: (suit) => tSuitName(t, suit),
          })}
          anchorRect={tooltipRect}
        />
      )}
    </button>
  );
}
