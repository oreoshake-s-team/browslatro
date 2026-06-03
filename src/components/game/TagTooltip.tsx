import { createPortal } from "react-dom";
import "./TagTooltip.css";
import type { TagSpec } from "../../items/tags";

interface TagTooltipProps {
  id: string;
  spec: TagSpec;
  anchorRect: DOMRect;
}

const TOOLTIP_OFFSET_PX = 8;

export default function TagTooltip({ id, spec, anchorRect }: TagTooltipProps) {
  const style: React.CSSProperties = {
    top: anchorRect.bottom + TOOLTIP_OFFSET_PX,
    left: anchorRect.left + anchorRect.width / 2,
  };
  return createPortal(
    <div id={id} role="tooltip" className="tag-tooltip" style={style}>
      <p className="tag-tooltip-heading">{spec.name}</p>
      <p className="tag-tooltip-description">{spec.description}</p>
    </div>,
    document.body,
  );
}
