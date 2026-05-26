import { Fragment, useRef, useState } from "react";
import "./Jokers.css";
import { MAX_JOKERS, type Joker } from "../../items/jokers";
import { insertIdAtIndex, nearestGapIndex } from "../../scoring/reordering";
import { useConsumableDropZone } from "../consumables/useConsumableDropZone";

interface JokersProps {
  jokers: ReadonlyArray<Joker>;
  pulseCounters?: Readonly<Record<string, number>>;
  onReorder?: (orderedIds: ReadonlyArray<string>) => void;
  consumableDropEnabled?: boolean;
  onConsumableDrop?: () => void;
}

export default function Jokers({
  jokers,
  pulseCounters,
  onReorder,
  consumableDropEnabled = false,
  onConsumableDrop,
}: JokersProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [activeGapIndex, setActiveGapIndex] = useState<number | null>(null);
  const dropZone = useConsumableDropZone({
    enabled: consumableDropEnabled,
    onDrop: onConsumableDrop,
  });
  const listRef = useRef<HTMLUListElement | null>(null);
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

  function handleListDragOver(e: React.DragEvent<HTMLUListElement>) {
    if (draggingId === null) return;
    const target = e.target as HTMLElement | null;
    if (target?.classList?.contains("joker-gap")) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
    const gap = nearestGapIndex(listRef.current, e.clientX, ".joker-gap");
    if (gap !== null && activeGapIndex !== gap) setActiveGapIndex(gap);
  }

  function handleListDrop(e: React.DragEvent<HTMLUListElement>) {
    e.preventDefault();
    const raw = e.dataTransfer ? e.dataTransfer.getData("text/plain") : "";
    const id = raw || draggingId;
    if (id && activeGapIndex !== null) applyDrop(id, activeGapIndex);
    endDrag();
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

  const showDropZone = Boolean(dropZone.onDrop);
  return (
    <section
      className={`jokers${showDropZone ? " jokers-consumable-target" : ""}${
        dropZone.hover ? " jokers-consumable-hover" : ""
      }`}
      aria-label="Equipped jokers"
      data-consumable-drop-active={showDropZone || undefined}
      onDragOver={dropZone.onDragOver}
      onDragLeave={dropZone.onDragLeave}
      onDrop={dropZone.onDrop}
    >
      {showDropZone && (
        <div
          className="consumable-drop-overlay consumable-drop-overlay-use"
          data-testid="consumable-drop-overlay-use"
          aria-hidden="true"
        >
          <span className="consumable-drop-overlay-label">Use</span>
        </div>
      )}
      <span className="jokers-label">Jokers</span>
      <ul
        ref={listRef}
        className={`jokers-list${draggingId !== null ? " jokers-list-dragging" : ""}`}
        onDragOver={reorderable ? handleListDragOver : undefined}
        onDrop={reorderable ? handleListDrop : undefined}
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
              </li>
            </Fragment>
          );
        })}
        {reorderable && jokers.length > 0 && renderGap(jokers.length)}
        {Array.from({ length: emptyCount }, (_, slotIndex) => (
          <Fragment key={`empty-${slotIndex}`}>
            {slotIndex > 0 && (
              <div
                className="joker-gap joker-gap-empty"
                data-testid={`joker-gap-empty-${slotIndex}`}
                aria-hidden="true"
              />
            )}
            <li
              className="joker-tile joker-tile-empty"
              aria-label="Empty joker slot"
              data-testid="joker-tile-empty"
            >
              Empty
            </li>
          </Fragment>
        ))}
      </ul>
    </section>
  );
}
