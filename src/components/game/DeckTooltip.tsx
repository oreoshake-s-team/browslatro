import { createPortal } from "react-dom";
import "./DeckTooltip.css";
import { useTooltipPosition } from "../system/useTooltipPosition";
import type { DeckSpec } from "../../items/decks";

interface DeckTooltipProps {
  id: string;
  spec: DeckSpec;
  anchorRect: DOMRect;
}

export default function DeckTooltip({ id, spec, anchorRect }: DeckTooltipProps) {
  const { ref, style } = useTooltipPosition(anchorRect);
  return createPortal(
    <div id={id} ref={ref} role="tooltip" className="deck-tooltip" style={style}>
      <p className="deck-tooltip-heading">{spec.name}</p>
      <p className="deck-tooltip-description">{spec.description}</p>
    </div>,
    document.body,
  );
}
