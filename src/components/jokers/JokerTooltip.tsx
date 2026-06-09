import { createPortal } from "react-dom";
import "./JokerTooltip.css";
import {
  JOKER_EDITION_INFO,
  JOKER_STICKER_INFO,
  PERISHABLE_LIFE,
  jokerSellValue,
  jokerStickers,
  probabilityMultiplierFromJokers,
  type Joker,
  type JokerRarity,
  type JokerSticker,
} from "../../items/jokers";
import { useGame } from "../../store/game";
import { countEnhancedInFullDeck } from "../../cards/deckBuild";
import { formatChanceRatio } from "../cards/cardInfo";

interface JokerTooltipProps {
  id: string;
  joker: Joker;
  anchorRect: DOMRect;
}

const TOOLTIP_OFFSET_PX = 8;

export default function JokerTooltip({ id, joker, anchorRect }: JokerTooltipProps) {
  const style: React.CSSProperties = {
    top: anchorRect.bottom + TOOLTIP_OFFSET_PX,
    left: anchorRect.left + anchorRect.width / 2,
  };
  const editionInfo = joker.edition ? JOKER_EDITION_INFO[joker.edition] : null;
  const editionClass = joker.edition
    ? `joker-tooltip-edition-${joker.edition}`
    : "";
  const sellValue = jokerSellValue(joker);
  const progress = useEnhancedThresholdProgress(joker);
  const effectiveOdds = useEffectiveOdds(joker);
  return createPortal(
    <div id={id} role="tooltip" className="joker-tooltip" style={style}>
      <p className="joker-tooltip-heading">{joker.name}</p>
      <p
        className={`joker-tooltip-rarity joker-tooltip-rarity-${joker.rarity}`}
        data-testid="joker-tooltip-rarity"
      >
        {rarityLabel(joker.rarity)}
      </p>
      <p className="joker-tooltip-description">{joker.description}</p>
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

function useEffectiveOdds(joker: Joker): string | null {
  const multiplier = useGame((s) => probabilityMultiplierFromJokers(s.jokers));
  const baseChance = getJokerBaseChance(joker);
  if (baseChance === null) return null;
  if (multiplier === 1) return null;
  return formatChanceRatio(baseChance, multiplier);
}
