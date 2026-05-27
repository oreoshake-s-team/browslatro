import { createPortal } from "react-dom";
import "./JokerTooltip.css";
import {
  JOKER_EDITION_INFO,
  jokerSellValue,
  type Joker,
} from "../../items/jokers";

interface JokerTooltipProps {
  id: string;
  joker: Joker;
  anchorRect: DOMRect;
}

const TOOLTIP_OFFSET_PX = 8;

export default function JokerTooltip({ id, joker, anchorRect }: JokerTooltipProps) {
  const style: React.CSSProperties = {
    top: anchorRect.bottom + TOOLTIP_OFFSET_PX,
    left: anchorRect.left + anchorRect.width / 2,
  };
  const editionInfo = joker.edition ? JOKER_EDITION_INFO[joker.edition] : null;
  const editionClass = joker.edition
    ? `joker-tooltip-edition-${joker.edition}`
    : "";
  const sellValue = jokerSellValue(joker);
  return createPortal(
    <div id={id} role="tooltip" className="joker-tooltip" style={style}>
      <p className="joker-tooltip-heading">{joker.name}</p>
      <p className="joker-tooltip-description">{joker.description}</p>
      {editionInfo && (
        <p className={`joker-tooltip-edition ${editionClass}`}>
          <strong>{editionInfo.name}</strong> — {editionInfo.description}
        </p>
      )}
      <p className="joker-tooltip-sell">Sell for ${sellValue}</p>
    </div>,
    document.body,
  );
}
