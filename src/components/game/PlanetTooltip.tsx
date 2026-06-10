import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import "./PlanetTooltip.css";
import {
  localizedConsumableDescription,
  localizedConsumableName,
} from "../../i18n/contentOverrides";
import type { PlanetCard } from "../../items/planets";

interface PlanetTooltipProps {
  id: string;
  card: PlanetCard;
  anchorRect: DOMRect;
}

const TOOLTIP_OFFSET_PX = 8;

export default function PlanetTooltip({
  id,
  card,
  anchorRect,
}: PlanetTooltipProps) {
  const { i18n } = useTranslation();
  const style: React.CSSProperties = {
    top: anchorRect.bottom + TOOLTIP_OFFSET_PX,
    left: anchorRect.left + anchorRect.width / 2,
  };
  return createPortal(
    <div id={id} role="tooltip" className="planet-tooltip" style={style}>
      <p className="planet-tooltip-heading">
        {localizedConsumableName(i18n.language, card.id, card.name)}
      </p>
      <p className="planet-tooltip-description">
        {localizedConsumableDescription(i18n.language, card.id, card.description)}
      </p>
    </div>,
    document.body,
  );
}
