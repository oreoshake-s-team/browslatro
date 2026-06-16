import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import "./CardTooltip.css";
import { tSuitName } from "../../i18n/strings";
import { useTooltipPosition } from "../system/useTooltipPosition";
import type { CardInfo } from "./cardInfo";

interface CardTooltipProps {
  id: string;
  info: CardInfo;
  anchorRect: DOMRect;
}

export default function CardTooltip({ id, info, anchorRect }: CardTooltipProps) {
  const { t } = useTranslation();
  const { ref, style } = useTooltipPosition(anchorRect);
  const heading = info.isStone
    ? t("a11y.stoneCard")
    : t("a11y.cardName", {
        rank: info.rank,
        suit: tSuitName(t, info.suitClass),
      });
  const suitColorClass = `card-tooltip-suit-${info.suitClass}`;
  return createPortal(
    <div id={id} ref={ref} role="tooltip" className="tooltip card-tooltip" style={style}>
      <p className="card-tooltip-heading">
        <span className="card-tooltip-rank">{info.rank}</span>
        <span className={`card-tooltip-suit ${suitColorClass}`} aria-hidden="true">
          {info.suitGlyph}
        </span>
        <span className="visually-hidden">{heading}</span>
      </p>
      {!info.isStone && (
        <p className="card-tooltip-chips">
          Base chips: <strong>{info.chips}</strong>
        </p>
      )}
      {info.bonusChips > 0 && (
        <p
          className="card-tooltip-bonus-chips"
          data-testid="card-tooltip-bonus-chips"
        >
          {t("cardLabels.extraChips", { value: info.bonusChips })}
        </p>
      )}
      {info.enhancement && (
        <p className="card-tooltip-enhancement">
          <strong>{info.enhancement.name}</strong> — {info.enhancement.description}
        </p>
      )}
      {info.seal && (
        <p className="card-tooltip-seal">
          <strong>{info.seal.name}</strong> — {info.seal.description}
        </p>
      )}
      {info.edition && (
        <p className="card-tooltip-edition">
          <strong>{info.edition.name}</strong> — {info.edition.description}
        </p>
      )}
    </div>,
    document.body,
  );
}
