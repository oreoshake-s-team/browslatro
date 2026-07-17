import { useTranslation } from "react-i18next";
import {
  localizedConsumableDescription,
  localizedConsumableName,
} from "../../i18n/contentOverrides";
import { appendFoolHint } from "../../i18n/foolCopyTarget";
import {
  MAX_CONSUMABLE_SLOTS,
  consumableSellValue,
  consumableUseBlock,
  type Consumable,
} from "../../items/consumables";
import { Tray } from "../ui/Panel";
import { emptyTile, tile } from "../ui/Tile";

export const CONSUMABLE_DRAG_MIME = "application/x-browslatro-consumable";

const KIND_ACCENT = {
  planet: "chips",
  tarot: "advisor",
  spectral: "success",
} as const;

interface ConsumablesProps {
  consumables: ReadonlyArray<Consumable>;
  foolCopyTarget?: string;
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
  foolCopyTarget,
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
    <Tray
      heading={t("trays.consumables")}
      aria-label={t("a11y.consumableSlots")}
      data-testid="consumables-tray"
    >
      <ul className="flex list-none flex-wrap gap-2">
        {consumables.map((entry, idx) => {
          const block = consumableUseBlock(entry, selectedCount, previewMode);
          const sellValue = consumableSellValue(entry);
          const canSell = Boolean(onSell);
          const useDisabled = block !== null;
          const interactionDisabled = useDisabled && !canSell;
          const description = appendFoolHint(
            localizedConsumableDescription(
              i18n.language,
              entry.card.id,
              entry.card.description,
            ),
            entry.card.id,
            foolCopyTarget,
          );
          return (
            <li key={`${entry.kind}-${entry.card.id}-${idx}`}>
              <button
                type="button"
                className={tile({
                  accent: KIND_ACCENT[entry.kind],
                  interactive: !interactionDisabled,
                  dimmed: useDisabled,
                })}
                data-testid={`consumable-tile-filled-${idx}`}
                data-consumable-kind={entry.kind}
                data-use-disabled={useDisabled || undefined}
                title={block ?? description}
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
                <span className="font-bold">
                  {localizedConsumableName(
                    i18n.language,
                    entry.card.id,
                    entry.card.name,
                  )}
                </span>
                <span className="line-clamp-3 text-muted">{description}</span>
                {canSell && (
                  <span
                    className="mt-auto font-semibold text-money"
                    aria-hidden="true"
                  >
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
              className={emptyTile}
              data-testid="consumable-tile-empty"
              aria-label={t("a11y.emptyConsumableSlot")}
              disabled
            >
              Empty
            </button>
          </li>
        ))}
      </ul>
    </Tray>
  );
}
