import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
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
    <div
      id={id}
      ref={ref}
      role="tooltip"
      className="pointer-events-none fixed z-50 flex -translate-x-1/2 w-56 flex-col gap-1 rounded-lg border border-border bg-raised p-3 text-xs text-ink shadow-lg shadow-black/40"
      style={style}
    >
      <p className="text-sm font-bold text-money">
        {localizedConsumableName(i18n.language, card.id, card.name)}
      </p>
      <p className="text-muted">
        {localizedConsumableDescription(i18n.language, card.id, card.description)}
      </p>
    </div>,
    document.body,
  );
}
