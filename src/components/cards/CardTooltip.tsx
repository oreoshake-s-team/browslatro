import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { tSuitName } from "../../i18n/strings";
import { useTooltipPosition } from "../system/useTooltipPosition";
import type { CardInfo } from "./cardInfo";

interface CardTooltipProps {
  id: string;
  info: CardInfo;
  anchorRect: DOMRect;
}

export default function CardTooltip({
  id,
  info,
  anchorRect,
}: CardTooltipProps) {
  const { t } = useTranslation();
  const { ref, style } = useTooltipPosition(anchorRect);
  const heading = info.isStone
    ? t("a11y.stoneCard")
    : t("a11y.cardName", {
        rank: info.rank,
        suit: tSuitName(t, info.suitClass),
      });
  return createPortal(
    <div
      id={id}
      ref={ref}
      role="tooltip"
      className="pointer-events-none fixed z-50 flex w-56 flex-col gap-1 rounded-lg border border-border bg-raised p-3 text-xs text-ink shadow-lg shadow-black/40"
      style={style}
    >
      <p className="flex items-center gap-1 text-sm font-bold">
        <span className="font-serif">{info.rank}</span>
        <span
          className={
            info.suitClass === "hearts" || info.suitClass === "diamonds"
              ? "text-mult"
              : "text-muted"
          }
          aria-hidden="true"
        >
          {info.suitGlyph}
        </span>
        <span className="sr-only">{heading}</span>
      </p>
      {!info.isStone && (
        <p className="text-chips">
          Base chips: <strong>{info.chips}</strong>
        </p>
      )}
      {info.bonusChips > 0 && (
        <p className="text-chips" data-testid="card-tooltip-bonus-chips">
          {t("cardLabels.extraChips", { value: info.bonusChips })}
        </p>
      )}
      {info.enhancement && (
        <p className="text-muted">
          <strong>{info.enhancement.name}</strong> —{" "}
          {info.enhancement.description}
        </p>
      )}
      {info.seal && (
        <p className="text-money">
          <strong>{info.seal.name}</strong> — {info.seal.description}
        </p>
      )}
      {info.edition && (
        <p className="text-advisor">
          <strong>{info.edition.name}</strong> — {info.edition.description}
        </p>
      )}
    </div>,
    document.body,
  );
}
