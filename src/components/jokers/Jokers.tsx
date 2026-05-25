import { Fragment, useState } from "react";
import "./Jokers.css";
import { MAX_JOKERS, type Joker } from "../../jokers";
import { insertIdAtIndex } from "../../reordering";

interface JokersProps {
  jokers: ReadonlyArray<Joker>;
  pulseCounters?: Readonly<Record<string, number>>;
  onReorder?: (orderedIds: ReadonlyArray<string>) => void;
}

export default function Jokers({ jokers, pulseCounters, onReorder }: JokersProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [activeGapIndex, setActiveGapIndex] = useState<number | null>(null);
  const emptyCount = Math.max(0, MAX_JOKERS - jokers.length);
  const reorderable = Boolean(onReorder);

  function endDrag() {
    setDraggingId(null);
    setActiveGapIndex(null);
  }

  function applyDrop(sourceId: string, gapIdx: number) {
    if (!onReorder) return;
    const ids = jokers.map((j) => j.id);
    const next = insertIdAtIndex(ids, sourceId, gapIdx);
    if (next !== ids) onReorder(next);
  }

  function moveJoker(jokerId: string, direction: -1 | 1) {
    const idx = jokers.findIndex((j) => j.id === jokerId);
    if (idx < 0) return;
    const target = idx + direction;
    if (target < 0 || target >= jokers.length) return;
    applyDrop(jokerId, direction === -1 ? target : target + 1);
  }

  function renderGap(gapIdx: number) {
    const fromIdx =
      draggingId !== null ? jokers.findIndex((j) => j.id === draggingId) : -1;
    const selfAdj = fromIdx >= 0 && (gapIdx === fromIdx || gapIdx === fromIdx + 1);
    const active = draggingId !== null && activeGapIndex === gapIdx && !selfAdj;
    return (
      <div
        className={`joker-gap${active ? " joker-gap-active" : ""}`}
        data-testid={`joker-gap-${gapIdx}`}
        onDragOver={(e) => {
          if (draggingId === null) return;
          e.preventDefault();
          if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
          if (activeGapIndex !== gapIdx) setActiveGapIndex(gapIdx);
        }}
        onDragLeave={() => {
          if (activeGapIndex === gapIdx) setActiveGapIndex(null);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const raw = e.dataTransfer ? e.dataTransfer.getData("text/plain") : "";
          const id = raw || draggingId;
          if (id) applyDrop(id, gapIdx);
          endDrag();
        }}
        aria-hidden="true"
      />
    );
  }

  return (
    <section className="jokers" aria-label="Equipped jokers">
      <span className="jokers-label">Jokers</span>
      <ul
        className={`jokers-list${draggingId !== null ? " jokers-list-dragging" : ""}`}
      >
        {jokers.map((joker, idx) => {
          const pulse = pulseCounters?.[joker.id] ?? 0;
          const isDragging = draggingId === joker.id;
          return (
            <Fragment key={joker.id}>
              {reorderable && renderGap(idx)}
              <li
                className={`joker-tile${reorderable ? " joker-tile-draggable" : ""}${
                  isDragging ? " joker-tile-dragging" : ""
                }`}
                title={joker.description}
                data-testid={`joker-tile-filled-${joker.id}`}
                draggable={reorderable || undefined}
                aria-grabbed={isDragging || undefined}
                onDragStart={
                  reorderable
                    ? (e) => {
                        setDraggingId(joker.id);
                        if (e.dataTransfer) {
                          e.dataTransfer.effectAllowed = "move";
                          e.dataTransfer.setData("text/plain", joker.id);
                        }
                      }
                    : undefined
                }
                onDragEnd={reorderable ? endDrag : undefined}
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
                {reorderable && (
                  <div className="joker-tile-reorder" role="group" aria-label={`Reorder ${joker.name}`}>
                    {([-1, 1] as const).map((dir) => (
                      <button
                        key={dir}
                        type="button"
                        className="joker-tile-reorder-button"
                        aria-label={`Move ${joker.name} ${dir === -1 ? "left" : "right"}`}
                        disabled={dir === -1 ? idx === 0 : idx === jokers.length - 1}
                        onClick={() => moveJoker(joker.id, dir)}
                      >
                        {dir === -1 ? "◀" : "▶"}
                      </button>
                    ))}
                  </div>
                )}
              </li>
            </Fragment>
          );
        })}
        {reorderable && jokers.length > 0 && renderGap(jokers.length)}
        {Array.from({ length: emptyCount }, (_, slotIndex) => (
          <li
            key={`empty-${slotIndex}`}
            className="joker-tile joker-tile-empty"
            aria-label="Empty joker slot"
            data-testid="joker-tile-empty"
          >
            Empty
          </li>
        ))}
      </ul>
    </section>
  );
}
