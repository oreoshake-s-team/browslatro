import { createPortal } from "react-dom";
import "./PlanetTooltip.css";
import type { PlanetCard } from "../../items/planets";

interface PlanetTooltipProps {
  id: string;
  card: PlanetCard;
  anchorRect: DOMRect;
}

const TOOLTIP_OFFSET_PX = 8;

export default function PlanetTooltip({
  id,
  card,
  anchorRect,
}: PlanetTooltipProps) {
  const style: React.CSSProperties = {
    top: anchorRect.bottom + TOOLTIP_OFFSET_PX,
    left: anchorRect.left + anchorRect.width / 2,
  };
  return createPortal(
    <div id={id} role="tooltip" className="planet-tooltip" style={style}>
      <p className="planet-tooltip-heading">{card.name}</p>
      <p className="planet-tooltip-description">{card.description}</p>
    </div>,
    document.body,
  );
}
