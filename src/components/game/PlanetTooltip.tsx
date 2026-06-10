import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import "./PlanetTooltip.css";
import { useTooltipPosition } from "../system/useTooltipPosition";
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

export default function PlanetTooltip({
  id,
  card,
  anchorRect,
}: PlanetTooltipProps) {
  const { i18n } = useTranslation();
  const { ref, style } = useTooltipPosition(anchorRect);
  return createPortal(
    <div id={id} ref={ref} role="tooltip" className="planet-tooltip" style={style}>
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
