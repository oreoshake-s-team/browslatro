import { createPortal } from "react-dom";
import { useTooltipPosition } from "../system/useTooltipPosition";

export interface TagTooltipSpec {
  readonly name: string;
  readonly description: string;
}

interface TagTooltipProps {
  id: string;
  spec: TagTooltipSpec;
  anchorRect: DOMRect;
}

export default function TagTooltip({ id, spec, anchorRect }: TagTooltipProps) {
  const { ref, style } = useTooltipPosition(anchorRect);
  return createPortal(
    <div
      id={id}
      ref={ref}
      role="tooltip"
      className="pointer-events-none fixed z-50 flex -translate-x-1/2 w-56 flex-col gap-1 rounded-lg border border-border bg-raised p-3 text-xs text-ink shadow-lg shadow-black/40"
      style={style}
    >
      <p className="text-sm font-bold">{spec.name}</p>
      <p className="text-muted">{spec.description}</p>
    </div>,
    document.body,
  );
}
