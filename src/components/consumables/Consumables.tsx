import "./Consumables.css";
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
  capacity?: number;
  onUse: (index: number) => void;
  onSell?: (index: number) => void;
  onDragStart?: (index: number) => void;
  onDragEnd?: () => void;
}

function tileLabel(c: Consumable, sellValue: number): string {
  return `Use ${c.card.name} (${c.kind}). Shift-click or drag to deck to sell for $${sellValue}.`;
}

export default function Consumables({
  consumables,
  selectedCount,
  capacity = MAX_CONSUMABLE_SLOTS,
  onUse,
  onSell,
  onDragStart,
  onDragEnd,
}: ConsumablesProps) {
  const emptyCount = Math.max(0, capacity - consumables.length);

  return (
    <section className="consumables" aria-label="Consumable slots">
      <span className="consumables-label">Consumables</span>
      <ul className="consumables-list">
        {consumables.map((entry, idx) => {
          const block = consumableUseBlock(entry, selectedCount);
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
                title={block ?? entry.card.description}
                aria-label={tileLabel(entry, sellValue)}
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
                <span className="consumable-tile-name">{entry.card.name}</span>
                <span className="consumable-tile-description">
                  {entry.card.description}
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
              aria-label="Empty consumable slot"
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
