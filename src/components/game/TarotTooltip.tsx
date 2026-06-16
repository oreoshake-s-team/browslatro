import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import "./TarotTooltip.css";
import { useTooltipPosition } from "../system/useTooltipPosition";
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

export default function TarotTooltip({
  id,
  card,
  anchorRect,
}: TarotTooltipProps) {
  const { i18n } = useTranslation();
  const { ref, style } = useTooltipPosition(anchorRect);
  return createPortal(
    <div id={id} ref={ref} role="tooltip" className="tooltip tarot-tooltip" style={style}>
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
