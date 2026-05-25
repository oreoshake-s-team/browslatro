import "./Consumables.css";
import {
  MAX_CONSUMABLE_SLOTS,
  type Consumable,
} from "../../consumables";

interface ConsumablesProps {
  consumables: ReadonlyArray<Consumable>;
  selectedCount: number;
  onUse: (index: number) => void;
}

function tileLabel(c: Consumable): string {
  const kindLabel = c.kind === "planet" ? "planet" : "tarot";
  return `Use ${c.card.name} (${kindLabel})`;
}

function selectionBlock(c: Consumable, selectedCount: number): string | null {
  if (c.kind !== "tarot") return null;
  const effect = c.card.effect;
  if (effect.kind !== "apply-enhancement") return null;
  if (selectedCount === 0) {
    return effect.maxTargets === 1
      ? "Select 1 card in your hand first"
      : `Select 1–${effect.maxTargets} cards in your hand first`;
  }
  if (selectedCount > effect.maxTargets) {
    return `Too many cards selected (max ${effect.maxTargets})`;
  }
  return null;
}

export default function Consumables({
  consumables,
  selectedCount,
  onUse,
}: ConsumablesProps) {
  const emptyCount = Math.max(0, MAX_CONSUMABLE_SLOTS - consumables.length);

  return (
    <section className="consumables" aria-label="Consumable slots">
      <span className="consumables-label">Consumables</span>
      <ul className="consumables-list">
        {consumables.map((entry, idx) => {
          const block = selectionBlock(entry, selectedCount);
          return (
            <li key={`${entry.kind}-${entry.card.id}-${idx}`}>
              <button
                type="button"
                className={`consumable-tile consumable-tile-${entry.kind}`}
                data-testid={`consumable-tile-filled-${idx}`}
                data-consumable-kind={entry.kind}
                title={block ?? entry.card.description}
                aria-label={tileLabel(entry)}
                disabled={block !== null}
                onClick={() => onUse(idx)}
              >
                <span className="consumable-tile-name">{entry.card.name}</span>
                <span className="consumable-tile-description">
                  {entry.card.description}
                </span>
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
