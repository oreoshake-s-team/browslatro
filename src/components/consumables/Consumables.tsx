import "./Consumables.css";
import {
  MAX_CONSUMABLE_SLOTS,
  type Consumable,
} from "../../consumables";

interface ConsumablesProps {
  consumables: ReadonlyArray<Consumable>;
  onUse: (index: number) => void;
}

function tileLabel(c: Consumable): string {
  const kindLabel = c.kind === "planet" ? "planet" : "tarot";
  return `Use ${c.card.name} (${kindLabel})`;
}

export default function Consumables({ consumables, onUse }: ConsumablesProps) {
  const emptyCount = Math.max(0, MAX_CONSUMABLE_SLOTS - consumables.length);

  return (
    <section className="consumables" aria-label="Consumable slots">
      <span className="consumables-label">Consumables</span>
      <ul className="consumables-list">
        {consumables.map((entry, idx) => (
          <li key={`${entry.kind}-${entry.card.id}-${idx}`}>
            <button
              type="button"
              className={`consumable-tile consumable-tile-${entry.kind}`}
              data-testid={`consumable-tile-filled-${idx}`}
              data-consumable-kind={entry.kind}
              title={entry.card.description}
              aria-label={tileLabel(entry)}
              onClick={() => onUse(idx)}
            >
              <span className="consumable-tile-name">{entry.card.name}</span>
              <span className="consumable-tile-description">
                {entry.card.description}
              </span>
            </button>
          </li>
        ))}
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
