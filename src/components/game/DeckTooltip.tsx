import { createPortal } from "react-dom";
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
    <div
      id={id}
      ref={ref}
      role="tooltip"
      className="pointer-events-none fixed z-50 flex -translate-x-1/2 w-56 flex-col gap-1 rounded-lg border border-border bg-raised p-3 text-xs text-ink shadow-lg shadow-black/40"
      style={style}
    >
      <p className="text-sm font-bold text-money">{spec.name}</p>
      <p className="text-muted">{spec.description}</p>
    </div>,
    document.body,
  );
}
