import { createPortal } from "react-dom";
import "./CardTooltip.css";
import type { CardInfo } from "./cardInfo";

interface CardTooltipProps {
  id: string;
  info: CardInfo;
  anchorRect: DOMRect;
}

const TOOLTIP_OFFSET_PX = 8;

export default function CardTooltip({ id, info, anchorRect }: CardTooltipProps) {
  const style: React.CSSProperties = {
    top: anchorRect.bottom + TOOLTIP_OFFSET_PX,
    left: anchorRect.left + anchorRect.width / 2,
  };
  const heading = info.isStone
    ? "Stone card"
    : `${info.rank} of ${info.suitLabel}`;
  const suitColorClass = `card-tooltip-suit-${info.suitClass}`;
  return createPortal(
    <div id={id} role="tooltip" className="card-tooltip" style={style}>
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
      {info.enhancement && (
        <p className="card-tooltip-enhancement">
          <strong>{info.enhancement.name}</strong> — {info.enhancement.description}
        </p>
      )}
    </div>,
    document.body,
  );
}
