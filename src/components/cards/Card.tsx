import { useId, useRef, useState } from "react";
import { cva } from "class-variance-authority";
import { useEscapeToClose } from "../system/useEscapeToClose";
import { useTranslation } from "react-i18next";
import type {
  Card as CardType,
  CardEdition,
  Enhancement,
  Rank,
  Seal,
  Suit,
} from "../../cards/types";
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
import { cn } from "../ui/cn";

const SUIT_GLYPHS: Record<Suit, string> = {
  spades: "♠",
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
};

type FaceRank = "J" | "Q" | "K";

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

const SEAL_DOT = {
  gold: "bg-money",
  red: "bg-mult",
  blue: "bg-chips",
  purple: "bg-advisor",
} as const satisfies Record<Seal, string>;

const VALUE_TEXT = {
  chips: "text-chips",
  mult: "text-mult",
  money: "text-money",
} as const satisfies Record<EnhancementValueColor, string>;

const playingCard = cva(
  "relative flex aspect-[5/7] w-16 shrink-0 flex-col rounded-lg border border-black/15 bg-card p-1.5 font-serif text-card-ink shadow-md shadow-black/30 transition-all",
  {
    variants: {
      enhancement: {
        none: "",
        bonus: "bg-linear-to-b from-card to-chips/30",
        mult: "bg-linear-to-b from-card to-mult/30",
        wild: "bg-linear-to-b from-card to-advisor/30",
        glass: "border-chips/60 bg-linear-to-b from-card/90 to-chips/40",
        steel: "bg-linear-to-b from-card to-muted/50",
        stone: "border-border bg-hover text-ink",
        gold: "bg-linear-to-b from-card to-money/50",
        lucky: "bg-linear-to-b from-card to-success/30",
      },
      edition: {
        none: "",
        foil: "ring-2 ring-chips",
        holographic: "ring-2 ring-advisor",
        polychrome: "ring-2 ring-success",
      },
      selected: {
        true: "-translate-y-4 border-chips ring-2 ring-chips",
      },
      interactive: {
        true: "cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
      },
      debuffed: {
        true: "opacity-50 saturate-50",
      },
      faceDown: {
        true: "border-black/40 bg-(--deck-back,var(--color-chips))",
      },
    },
    compoundVariants: [
      {
        interactive: true,
        selected: false,
        className: "hover:-translate-y-1 hover:shadow-lg",
      },
    ],
    defaultVariants: {
      enhancement: "none",
      edition: "none",
      selected: false,
      interactive: false,
      debuffed: false,
      faceDown: false,
    },
  },
);

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
  useEscapeToClose(() => setTooltipRect(null), tooltipRect !== null);
  const isStone = card.enhancement === "stone";
  const showBack = card.faceDown === true && !scoring;
  const suitText = isStone
    ? ""
    : card.suit === "hearts" || card.suit === "diamonds"
      ? "text-suit-red"
      : "text-card-ink";
  const anyScoring = scoring || goldScoring || steelScoring;
  const scoringRing = goldScoring
    ? "ring-2 ring-money"
    : steelScoring
      ? "ring-2 ring-muted"
      : scoring
        ? "ring-2 ring-money"
        : "";
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

  const cardClassName = cn(
    playingCard({
      enhancement: showBack ? "none" : (card.enhancement ?? "none"),
      edition: showBack ? "none" : (card.edition ?? "none"),
      selected,
      interactive: !decorative,
      debuffed,
      faceDown: showBack,
    }),
    suitText,
    forced && !showBack && "ring-2 ring-money",
    anyScoring && scoringRing,
    newlyDrawn && !discarding && "animate-fade-in",
    discarding && "animate-fly-out",
  );
  const content = (
    <>
      {anyScoring && (
        <span
          key={`pulse-${scoringPulseTick % 2}`}
          className={cn(
            "pointer-events-none absolute inset-0 animate-pulse-flash rounded-lg",
            steelScoring ? "bg-muted/30" : "bg-money/30",
          )}
          aria-hidden="true"
        />
      )}
      {showBack ? (
        <span aria-hidden="true" data-testid={`card-back-${card.id}`} />
      ) : isStone ? (
        <span
          className="flex flex-1 items-center justify-center text-2xl"
          aria-hidden="true"
        >
          🪨
        </span>
      ) : (
        <>
          <span
            className="flex items-baseline gap-0.5 text-sm leading-none font-bold"
            aria-hidden="true"
          >
            <span>{card.rank}</span>
            <span>{SUIT_GLYPHS[card.suit]}</span>
          </span>
          {isLucky ? (
            <span
              className="flex flex-1 flex-col items-center justify-center gap-0.5 text-center font-sans text-[0.55rem] leading-tight font-semibold"
              aria-hidden="true"
              data-testid={`card-center-lucky-${card.id}`}
            >
              <span className="text-mult">
                {t("cardLabels.luckyOddsMult", {
                  n: luckyMultDenom,
                  amount: LUCKY_ENHANCEMENT_MULT_AMOUNT,
                })}
              </span>
              <span className="text-money">
                {t("cardLabels.luckyOddsMoney", {
                  n: luckyMoneyDenom,
                  amount: LUCKY_ENHANCEMENT_MONEY_AMOUNT,
                })}
              </span>
            </span>
          ) : displayValue ? (
            <span
              className={cn(
                "flex flex-1 flex-col items-center justify-center text-center font-sans text-xs leading-tight font-bold",
                VALUE_TEXT[displayValue.color],
              )}
              aria-hidden="true"
              data-testid={`card-center-value-${card.id}`}
            >
              {displayValue.text}
              {displayValue.timing !== "scored" && (
                <span className="font-normal text-muted">
                  {t(ENHANCEMENT_VALUE_TIMING_CAPTION_KEY[displayValue.timing])}
                </span>
              )}
            </span>
          ) : isFaceRank(card.rank) ? (
            <span
              className="flex flex-1 flex-col items-center justify-center leading-none"
              aria-hidden="true"
            >
              <span className="text-2xl">{FACE_RANK_GLYPH[card.rank]}</span>
              <span className="text-xs font-bold">{card.rank}</span>
            </span>
          ) : (
            <span
              className="flex flex-1 items-center justify-center text-2xl"
              aria-hidden="true"
            >
              {SUIT_GLYPHS[card.suit]}
            </span>
          )}
        </>
      )}
      {card.seal && !showBack && (
        <span
          className={cn(
            "absolute top-6 right-1 size-3 rounded-full ring-1 ring-black/30",
            SEAL_DOT[card.seal],
          )}
          aria-hidden="true"
          data-testid={`card-seal-${card.id}`}
        />
      )}
      {forced && !showBack && (
        <span
          className="absolute -top-2 -right-1 text-sm"
          aria-hidden="true"
          data-testid={`card-forced-${card.id}`}
        >
          🔒
        </span>
      )}
      {luckyMultScoring && (
        <span
          className="absolute inset-x-0 top-0 z-10 animate-float-up text-center font-sans text-sm font-bold text-mult"
          aria-hidden="true"
          data-testid={`lucky-mult-scoring-${card.id}`}
        >
          +20
        </span>
      )}
      {luckyMoneyScoring && (
        <span
          className="absolute inset-x-0 top-4 z-10 animate-float-up text-center font-sans text-sm font-bold text-money"
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
