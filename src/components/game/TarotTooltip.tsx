import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import "./TarotTooltip.css";
import {
  localizedConsumableDescription,
  localizedConsumableName,
} from "../../i18n/contentOverrides";
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
  const { i18n } = useTranslation();
  const style: React.CSSProperties = {
    top: anchorRect.bottom + TOOLTIP_OFFSET_PX,
    left: anchorRect.left + anchorRect.width / 2,
  };
  return createPortal(
    <div id={id} role="tooltip" className="tarot-tooltip" style={style}>
      <p className="tarot-tooltip-heading">
        {localizedConsumableName(i18n.language, card.id, card.name)}
      </p>
      <p className="tarot-tooltip-description">
        {localizedConsumableDescription(i18n.language, card.id, card.description)}
      </p>
    </div>,
    document.body,
  );
}
