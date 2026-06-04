import { createPortal } from "react-dom";
import "./TarotTooltip.css";
import type { TarotCard } from "../../items/tarots";

interface TarotTooltipProps {
  id: string;
  card: TarotCard;
  anchorRect: DOMRect;
}

const TOOLTIP_OFFSET_PX = 8;

export default function TarotTooltip({
  id,
  card,
  anchorRect,
}: TarotTooltipProps) {
  const style: React.CSSProperties = {
    top: anchorRect.bottom + TOOLTIP_OFFSET_PX,
    left: anchorRect.left + anchorRect.width / 2,
  };
  return createPortal(
    <div id={id} role="tooltip" className="tarot-tooltip" style={style}>
      <p className="tarot-tooltip-heading">{card.name}</p>
      <p className="tarot-tooltip-description">{card.description}</p>
    </div>,
    document.body,
  );
}
