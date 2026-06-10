import { useTranslation } from "react-i18next";
import "./Consumables.css";
import {
  localizedConsumableDescription,
  localizedConsumableName,
} from "../../i18n/contentOverrides";
import {
  MAX_CONSUMABLE_SLOTS,
  consumableSellValue,
  consumableUseBlock,
  type Consumable,
} from "../../items/consumables";

export const CONSUMABLE_DRAG_MIME = "application/x-browslatro-consumable";

interface ConsumablesProps {
  consumables: ReadonlyArray<Consumable>;
  selectedCount: number;
  previewMode?: boolean;
  capacity?: number;
  onUse: (index: number) => void;
  onSell?: (index: number) => void;
  onDragStart?: (index: number) => void;
  onDragEnd?: () => void;
}

export default function Consumables({
  consumables,
  selectedCount,
  previewMode = false,
  capacity = MAX_CONSUMABLE_SLOTS,
  onUse,
  onSell,
  onDragStart,
  onDragEnd,
}: ConsumablesProps) {
  const { t, i18n } = useTranslation();
  const emptyCount = Math.max(0, capacity - consumables.length);

  return (
    <section
      className={`consumables${consumables.length === 0 ? " consumables-tray-empty" : ""}`}
      aria-label={t("a11y.consumableSlots")}
      data-testid="consumables-tray"
    >
      <span className="consumables-label">{t("trays.consumables")}</span>
      <ul className="consumables-list">
        {consumables.map((entry, idx) => {
          const block = consumableUseBlock(entry, selectedCount, previewMode);
          const sellValue = consumableSellValue(entry);
          const canSell = Boolean(onSell);
          const useDisabled = block !== null;
          const interactionDisabled = useDisabled && !canSell;
          return (
            <li key={`${entry.kind}-${entry.card.id}-${idx}`}>
              <button
                type="button"
                className={`consumable-tile consumable-tile-${entry.kind}`}
                data-testid={`consumable-tile-filled-${idx}`}
                data-consumable-kind={entry.kind}
                data-use-disabled={useDisabled || undefined}
                title={
                  block ??
                  localizedConsumableDescription(
                    i18n.language,
                    entry.card.id,
                    entry.card.description,
                  )
                }
                aria-label={t("a11y.consumableTile", {
                  name: localizedConsumableName(
                    i18n.language,
                    entry.card.id,
                    entry.card.name,
                  ),
                  kind: entry.kind,
                  value: sellValue,
                })}
                disabled={interactionDisabled}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData(CONSUMABLE_DRAG_MIME, String(idx));
                  onDragStart?.(idx);
                }}
                onDragEnd={() => onDragEnd?.()}
                onClick={(e) => {
                  if (e.shiftKey && canSell) {
                    onSell?.(idx);
                    return;
                  }
                  if (useDisabled) return;
                  onUse(idx);
                }}
              >
                <span className="consumable-tile-name">
                  {localizedConsumableName(
                    i18n.language,
                    entry.card.id,
                    entry.card.name,
                  )}
                </span>
                <span className="consumable-tile-description">
                  {localizedConsumableDescription(
                    i18n.language,
                    entry.card.id,
                    entry.card.description,
                  )}
                </span>
                {canSell && (
                  <span className="consumable-tile-sell" aria-hidden="true">
                    Sell ${sellValue}
                  </span>
                )}
              </button>
            </li>
          );
        })}
        {Array.from({ length: emptyCount }, (_, slotIndex) => (
          <li key={`empty-${slotIndex}`}>
            <button
              type="button"
              className="consumable-tile consumable-tile-empty"
              data-testid="consumable-tile-empty"
              aria-label={t("a11y.emptyConsumableSlot")}
              disabled
            >
              Empty
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
