import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import "./JokerTooltip.css";
import { localizedJokerName } from "../../i18n/jokerOverrides";
import { dynamicJokerDescriptionNode } from "../../items/jokers/dynamicJokerDescription";
import { tSuitName } from "../../i18n/strings";
import {
  JOKER_EDITION_INFO,
  JOKER_STICKER_INFO,
  PERISHABLE_LIFE,
  jokerCurrentValue,
  jokerCurrentValueLabel,
  jokerEnhancementFilter,
  jokerSellValue,
  jokerStickers,
  probabilityMultiplierFromJokers,
  resolveJokerEffect,
  resolveJokerTargetIndex,
  type Joker,
  type JokerCurrentValue,
  type JokerRarity,
  type JokerSticker,
} from "../../items/jokers";
import { useGame } from "../../store/game";
import {
  countEnhancedInFullDeck,
  countEnhancementInFullDeck,
  countMissingFromFullDeck,
  fullDeckSize,
} from "../../cards/deckBuild";
import { formatChanceRatio } from "../cards/cardInfo";
import { useTooltipPosition } from "../system/useTooltipPosition";

interface JokerTooltipProps {
  id: string;
  joker: Joker;
  jokers?: ReadonlyArray<Joker>;
  jokerIndex?: number;
  anchorRect: DOMRect;
}

export default function JokerTooltip({ id, joker, jokers = [], jokerIndex = 0, anchorRect }: JokerTooltipProps) {
  const { t, i18n } = useTranslation();
  const { ref, style } = useTooltipPosition(anchorRect);
  const copyTargetLabel = computeCopyTargetLabel(jokers, jokerIndex);
  const editionInfo = joker.edition ? JOKER_EDITION_INFO[joker.edition] : null;
  const editionClass = joker.edition
    ? `joker-tooltip-edition-${joker.edition}`
    : "";
  const todoHand = useGame((s) => s.todoHand);
  const castleSuit = useGame((s) => s.castleSuit);
  const castleSuitName = castleSuit ? tSuitName(t, castleSuit) : null;
  const sellValue = jokerSellValue(joker);
  const progress = useEnhancedThresholdProgress(joker);
  const effectiveOdds = useEffectiveOdds(joker);
  const currentValue = useCurrentValue(joker);
  return createPortal(
    <div id={id} ref={ref} role="tooltip" className="joker-tooltip" style={style}>
      <p className="joker-tooltip-heading">
        {localizedJokerName(i18n.language, joker.id, joker.name)}
      </p>
      {copyTargetLabel !== null && (
        <p className="joker-tooltip-copy-target" data-testid="joker-tooltip-copy-target">
          Copying: {copyTargetLabel}
        </p>
      )}
      <p
        className={`joker-tooltip-rarity joker-tooltip-rarity-${joker.rarity}`}
        data-testid="joker-tooltip-rarity"
      >
        {rarityLabel(joker.rarity)}
      </p>
      <p className="joker-tooltip-description" data-testid="joker-tooltip-description">
        {dynamicJokerDescriptionNode({
          language: i18n.language,
          jokerId: joker.id,
          description: joker.description,
          todoHand,
          castleSuit,
          castleSuitName,
        })}
      </p>
      {currentValue && (
        <p
          className="joker-tooltip-current-value"
          data-testid="joker-tooltip-current-value"
        >
          {jokerCurrentValueLabel(currentValue)}
        </p>
      )}
      {effectiveOdds && (
        <p
          className="joker-tooltip-effective-odds"
          data-testid="joker-tooltip-effective-odds"
        >
          Effective odds: {effectiveOdds}
        </p>
      )}
      {progress && (
        <p
          className="joker-tooltip-progress"
          data-testid="joker-tooltip-enhanced-progress"
        >
          Enhanced cards: {progress.count} / {progress.threshold}
        </p>
      )}
      {editionInfo && (
        <p className={`joker-tooltip-edition ${editionClass}`}>
          <strong>{editionInfo.name}</strong> — {editionInfo.description}
        </p>
      )}
      {jokerStickers(joker).map((sticker, idx) => (
        <p
          key={`${sticker.kind}-${idx}`}
          className={`joker-tooltip-sticker joker-tooltip-sticker-${sticker.kind}`}
          data-testid={`joker-tooltip-sticker-${sticker.kind}`}
        >
          <strong>{JOKER_STICKER_INFO[sticker.kind].name}</strong> — {stickerLine(sticker)}
        </p>
      ))}
      <p className="joker-tooltip-sell">Sell for ${sellValue}</p>
    </div>,
    document.body,
  );
}

function computeCopyTargetLabel(
  jokers: ReadonlyArray<Joker>,
  index: number,
): string | null {
  const effect = jokers[index]?.effect;
  if (effect?.kind !== "copy-right-joker" && effect?.kind !== "copy-leftmost-joker") {
    return null;
  }
  if (resolveJokerEffect(jokers, index).kind === "noop") {
    return "incompatible";
  }
  return jokers[resolveJokerTargetIndex(jokers, index)].name;
}

function rarityLabel(rarity: JokerRarity): string {
  return rarity.charAt(0).toUpperCase() + rarity.slice(1);
}

function stickerLine(sticker: JokerSticker): string {
  if (sticker.kind === "perishable") {
    if (sticker.roundsHeld >= PERISHABLE_LIFE) return "debuffed";
    const remaining = PERISHABLE_LIFE - sticker.roundsHeld;
    return `${remaining} of ${PERISHABLE_LIFE} rounds left`;
  }
  return JOKER_STICKER_INFO[sticker.kind].description;
}

function useEnhancedThresholdProgress(
  joker: Joker,
): { readonly count: number; readonly threshold: number } | null {
  const baseDeckCards = useGame((s) => s.baseDeckCards);
  const destroyedCardIds = useGame((s) => s.destroyedCardIds);
  const addedCards = useGame((s) => s.addedCards);
  const cardEnhancementsById = useGame((s) => s.cardEnhancementsById);
  if (joker.effect.kind !== "x-mult-when-enhanced-count-at-least") return null;
  const count = countEnhancedInFullDeck(
    baseDeckCards,
    destroyedCardIds,
    addedCards,
    cardEnhancementsById,
  );
  return { count, threshold: joker.effect.threshold };
}

function getJokerBaseChance(joker: Joker): number | null {
  const e = joker.effect;
  if (
    e.kind === "business-card" ||
    e.kind === "per-suit-chance-x-mult" ||
    e.kind === "per-held-face-chance-money"
  ) {
    return e.chance;
  }
  return null;
}

function useCurrentValue(joker: Joker): JokerCurrentValue | null {
  const blindsSkipped = useGame((s) => s.runStats.blindsSkipped);
  const addedCardsCount = useGame((s) => s.addedCards.length);
  const missingDeckCards = useGame((s) =>
    countMissingFromFullDeck(s.baseDeckCards, s.destroyedCardIds, s.addedCards),
  );
  const money = useGame((s) => s.money);
  const jokerCount = useGame((s) => s.jokers.length);
  const remainingDiscards = useGame((s) => s.remainingDiscards);
  const remainingDeckCards = useGame((s) =>
    s.dealt.hand.length > 0
      ? s.dealt.remaining.length
      : fullDeckSize(s.baseDeckCards, s.destroyedCardIds, s.addedCards),
  );
  const enhancement = jokerEnhancementFilter(joker);
  const matchingEnhancedDeckCards = useGame((s) =>
    countEnhancementInFullDeck(
      s.baseDeckCards,
      s.destroyedCardIds,
      s.addedCards,
      s.cardEnhancementsById,
      enhancement,
    ),
  );
  return jokerCurrentValue(joker, {
    blindsSkipped,
    addedCardsCount,
    missingDeckCards,
    money,
    jokerCount,
    remainingDiscards,
    remainingDeckCards,
    matchingEnhancedDeckCards,
  });
}

function useEffectiveOdds(joker: Joker): string | null {
  const multiplier = useGame((s) => probabilityMultiplierFromJokers(s.jokers));
  const baseChance = getJokerBaseChance(joker);
  if (baseChance === null) return null;
  if (multiplier === 1) return null;
  return formatChanceRatio(baseChance, multiplier);
}
