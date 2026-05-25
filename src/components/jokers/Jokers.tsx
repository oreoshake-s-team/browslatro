import "./Jokers.css";
import { MAX_JOKERS, type Joker } from "../../jokers";

interface JokersProps {
  jokers: ReadonlyArray<Joker>;
  pulseCounters?: Readonly<Record<string, number>>;
}

const EMPTY_SLOT_LABEL = "Empty joker slot";

export default function Jokers({ jokers, pulseCounters }: JokersProps) {
  const emptyCount = Math.max(0, MAX_JOKERS - jokers.length);
  const emptySlots: number[] = [];
  for (let i = 0; i < emptyCount; i += 1) emptySlots.push(i);

  return (
    <section className="jokers" aria-label="Equipped jokers">
      <span className="jokers-label">Jokers</span>
      <ul className="jokers-list">
        {jokers.map((joker) => {
          const pulse = pulseCounters?.[joker.id] ?? 0;
          return (
            <li
              key={joker.id}
              className="joker-tile"
              title={joker.description}
              data-testid={`joker-tile-filled-${joker.id}`}
            >
              <div
                key={`pulse-${pulse}`}
                className={
                  pulse > 0 ? "joker-tile-inner joker-tile-pulse" : "joker-tile-inner"
                }
                data-testid={`joker-tile-inner-${joker.id}`}
                data-pulse={pulse}
              >
                <span className="joker-tile-name">{joker.name}</span>
                <span className="joker-tile-description">{joker.description}</span>
              </div>
            </li>
          );
        })}
        {emptySlots.map((slotIndex) => (
          <li
            key={`empty-${slotIndex}`}
            className="joker-tile joker-tile-empty"
            aria-label={EMPTY_SLOT_LABEL}
            data-testid="joker-tile-empty"
          >
            Empty
          </li>
        ))}
      </ul>
    </section>
  );
}
