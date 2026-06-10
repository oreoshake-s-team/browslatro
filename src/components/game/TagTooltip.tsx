import { createPortal } from "react-dom";
import "./TagTooltip.css";
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
    <div id={id} ref={ref} role="tooltip" className="tag-tooltip" style={style}>
      <p className="tag-tooltip-heading">{spec.name}</p>
      <p className="tag-tooltip-description">{spec.description}</p>
    </div>,
    document.body,
  );
}
