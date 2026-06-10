import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import "./SpectralTooltip.css";
import { useTooltipPosition } from "../system/useTooltipPosition";
import {
  localizedConsumableDescription,
  localizedConsumableName,
} from "../../i18n/contentOverrides";
import type { SpectralCard } from "../../items/spectrals";

interface SpectralTooltipProps {
  id: string;
  card: SpectralCard;
  anchorRect: DOMRect;
}

export default function SpectralTooltip({
  id,
  card,
  anchorRect,
}: SpectralTooltipProps) {
  const { i18n } = useTranslation();
  const { ref, style } = useTooltipPosition(anchorRect);
  return createPortal(
    <div id={id} ref={ref} role="tooltip" className="spectral-tooltip" style={style}>
      <p className="spectral-tooltip-heading">
        {localizedConsumableName(i18n.language, card.id, card.name)}
      </p>
      <p className="spectral-tooltip-description">
        {localizedConsumableDescription(i18n.language, card.id, card.description)}
      </p>
    </div>,
    document.body,
  );
}
