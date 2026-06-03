import { createPortal } from "react-dom";
import "./SpectralTooltip.css";
import type { SpectralCard } from "../../items/spectrals";

interface SpectralTooltipProps {
  id: string;
  card: SpectralCard;
  anchorRect: DOMRect;
}

const TOOLTIP_OFFSET_PX = 8;

export default function SpectralTooltip({
  id,
  card,
  anchorRect,
}: SpectralTooltipProps) {
  const style: React.CSSProperties = {
    top: anchorRect.bottom + TOOLTIP_OFFSET_PX,
    left: anchorRect.left + anchorRect.width / 2,
  };
  return createPortal(
    <div id={id} role="tooltip" className="spectral-tooltip" style={style}>
      <p className="spectral-tooltip-heading">{card.name}</p>
      <p className="spectral-tooltip-description">{card.description}</p>
    </div>,
    document.body,
  );
}
