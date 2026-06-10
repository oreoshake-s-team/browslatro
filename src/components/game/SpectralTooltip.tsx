import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import "./SpectralTooltip.css";
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

const TOOLTIP_OFFSET_PX = 8;

export default function SpectralTooltip({
  id,
  card,
  anchorRect,
}: SpectralTooltipProps) {
  const { i18n } = useTranslation();
  const style: React.CSSProperties = {
    top: anchorRect.bottom + TOOLTIP_OFFSET_PX,
    left: anchorRect.left + anchorRect.width / 2,
  };
  return createPortal(
    <div id={id} role="tooltip" className="spectral-tooltip" style={style}>
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
