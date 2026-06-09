import { createPortal } from "react-dom";
import "./DeckTooltip.css";
import type { DeckSpec } from "../../items/decks";

interface DeckTooltipProps {
  id: string;
  spec: DeckSpec;
  anchorRect: DOMRect;
}

const TOOLTIP_OFFSET_PX = 8;

export default function DeckTooltip({ id, spec, anchorRect }: DeckTooltipProps) {
  const style: React.CSSProperties = {
    top: anchorRect.bottom + TOOLTIP_OFFSET_PX,
    left: anchorRect.left + anchorRect.width / 2,
  };
  return createPortal(
    <div id={id} role="tooltip" className="deck-tooltip" style={style}>
      <p className="deck-tooltip-heading">{spec.name}</p>
      <p className="deck-tooltip-description">{spec.description}</p>
    </div>,
    document.body,
  );
}
