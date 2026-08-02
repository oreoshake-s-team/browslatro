import { Fragment, useCallback, useId, useRef, useState } from "react";
import { useEscapeToClose } from "../system/useEscapeToClose";
import { useTranslation } from "react-i18next";
import { localizedJokerName } from "../../i18n/jokerOverrides";
import { Tray } from "../ui/Panel";
import { cn, emptyTile } from "../ui/Tile";
import {
  MAX_JOKERS,
  effectiveJokerCount,
  jokerSellValue,
  type Joker,
} from "../../items/jokers";
import { insertIdAtIndex, nearestGapIndex } from "../../scoring/reordering";
import { announce } from "../system/LiveAnnouncer";
import { useMimeDropZone } from "../system/useMimeDropZone";
import { CONSUMABLE_DRAG_MIME } from "../consumables/Consumables";
import JokerTile from "./JokerTile";
import RenderProfiler from "../../dev/RenderProfiler";

export const JOKER_DRAG_MIME = "application/x-browslatro-joker";

interface JokersProps {
  jokers: ReadonlyArray<Joker>;
  capacity?: number;
  faceDown?: boolean;
  pulseCounters?: Readonly<Record<string, number>>;
  onReorder?: (orderedIds: ReadonlyArray<string>) => void;
  onSell?: (index: number) => void;
  sellAlwaysVisible?: boolean;
  onDragStart?: (index: number) => void;
  onDragEnd?: () => void;
  consumableDropEnabled?: boolean;
  onConsumableDrop?: () => void;
}

export default function Jokers({
  jokers,
  capacity = MAX_JOKERS,
  faceDown = false,
  pulseCounters,
  onReorder,
  onSell,
  sellAlwaysVisible = false,
  onDragStart,
  onDragEnd,
  consumableDropEnabled = false,
  onConsumableDrop,
}: JokersProps) {
  const { t, i18n } = useTranslation();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [activeGapIndex, setActiveGapIndex] = useState<number | null>(null);
  const [tooltipOpenId, setTooltipOpenId] = useState<string | null>(null);
  const [tooltipRect, setTooltipRect] = useState<DOMRect | null>(null);
  const tooltipIdBase = useId();
  const dropZone = useMimeDropZone({
    enabled: consumableDropEnabled,
    mime: CONSUMABLE_DRAG_MIME,
    onDrop: onConsumableDrop,
  });
  const listRef = useRef<HTMLUListElement | null>(null);
  const emptyCount = Math.max(0, capacity - effectiveJokerCount(jokers));
  const reorderable = Boolean(onReorder) && !faceDown;
  const sellable = Boolean(onSell) && !faceDown;
  const tileDraggable = reorderable || sellable;

  useEscapeToClose(() => {
    setTooltipOpenId(null);
    setTooltipRect(null);
  }, tooltipOpenId !== null);

  const openTooltip = useCallback((id: string, el: HTMLElement) => {
    setTooltipOpenId(id);
    setTooltipRect(el.getBoundingClientRect());
  }, []);

  const closeTooltip = useCallback((id: string) => {
    setTooltipOpenId((prev) => {
      if (prev === id) {
        setTooltipRect(null);
        return null;
      }
      return prev;
    });
  }, []);

  const endDrag = useCallback(() => {
    setDraggingId(null);
    setActiveGapIndex(null);
    onDragEnd?.();
  }, [onDragEnd]);

  const applyDrop = useCallback(
    (sourceId: string, gapIdx: number) => {
      if (!onReorder) return;
      const ids = jokers.map((j) => j.id);
      const next = insertIdAtIndex(ids, sourceId, gapIdx);
      if (next !== ids) onReorder(next);
    },
    [jokers, onReorder],
  );

  const moveJoker = useCallback(
    (joker: Joker, idx: number, direction: -1 | 1) => {
      const name = localizedJokerName(i18n.language, joker.id, joker.name);
      if (direction === -1 && idx === 0) {
        announce(t("a11y.atStart", { item: name }));
        return;
      }
      if (direction === 1 && idx === jokers.length - 1) {
        announce(t("a11y.atEnd", { item: name }));
        return;
      }
      applyDrop(joker.id, direction === -1 ? idx - 1 : idx + 2);
      announce(
        t("a11y.movedTo", {
          item: name,
          position: idx + direction + 1,
          total: jokers.length,
        }),
      );
    },
    [applyDrop, i18n.language, jokers.length, t],
  );

  const sellJokerAt = useCallback(
    (joker: Joker, idx: number) => {
      if (!onSell) return;
      announce(
        t("a11y.soldJoker", {
          name: localizedJokerName(i18n.language, joker.id, joker.name),
          value: jokerSellValue(joker),
        }),
      );
      onSell(idx);
    },
    [i18n.language, onSell, t],
  );

  const handleTileDragStart = useCallback(
    (
      e: React.DragEvent<HTMLLIElement>,
      joker: Joker,
      idx: number,
      sellableNow: boolean,
    ) => {
      setDraggingId(joker.id);
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", joker.id);
        if (sellableNow) {
          e.dataTransfer.setData(JOKER_DRAG_MIME, String(idx));
        }
      }
      onDragStart?.(idx);
    },
    [onDragStart],
  );

  function handleListDragOver(e: React.DragEvent<HTMLUListElement>) {
    if (draggingId === null) return;
    const target = e.target as HTMLElement | null;
    if (target?.dataset?.jokerGap !== undefined) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
    const gaps =
      listRef.current?.querySelectorAll<HTMLElement>("[data-joker-gap]");
    const rects = gaps
      ? Array.from(gaps, (gap) => gap.getBoundingClientRect())
      : [];
    const gap = nearestGapIndex(rects, e.clientX);
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
    const selfAdj =
      fromIdx >= 0 && (gapIdx === fromIdx || gapIdx === fromIdx + 1);
    const active = draggingId !== null && activeGapIndex === gapIdx && !selfAdj;
    return (
      <div
        className={cn(
          "w-1 shrink-0 self-stretch rounded transition-all",
          active && "w-tile-w border-2 border-dashed border-focus",
        )}
        data-joker-gap=""
        data-active={active || undefined}
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
          const raw = e.dataTransfer
            ? e.dataTransfer.getData("text/plain")
            : "";
          const id = raw || draggingId;
          if (id) applyDrop(id, gapIdx);
          endDrag();
        }}
        aria-hidden="true"
      />
    );
  }

  // Keys follow the joker (not its index) so the focused move/sell button
  // survives a reorder; the occurrence suffix disambiguates duplicates.
  const seenIds = new Map<string, number>();
  const jokerKeys = jokers.map((j) => {
    const n = seenIds.get(j.id) ?? 0;
    seenIds.set(j.id, n + 1);
    return `${j.id}-${n}`;
  });

  const showDropZone = Boolean(dropZone.onDrop);
  return (
    <RenderProfiler id="Jokers">
    <Tray
      heading={t("trays.jokers")}
      className="relative min-w-0 flex-1"
      aria-label={t("a11y.equippedJokers")}
      data-testid="jokers-tray"
      data-consumable-drop-active={showDropZone || undefined}
      onDragOver={dropZone.onDragOver}
      onDragLeave={dropZone.onDragLeave}
      onDrop={dropZone.onDrop}
    >
      {showDropZone && (
        <div
          className={cn(
            "pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-success/20 text-lg font-bold text-success",
            dropZone.hover && "bg-success/30 ring-2 ring-success",
          )}
          data-testid="consumable-drop-overlay-use"
          aria-hidden="true"
        >
          <span>Use</span>
        </div>
      )}
      <ul
        ref={listRef}
        className="flex min-w-0 list-none flex-nowrap items-stretch gap-1"
        data-testid="jokers-list"
        onDragOver={reorderable ? handleListDragOver : undefined}
        onDrop={reorderable ? handleListDrop : undefined}
      >
        {jokers.map((joker, idx) => {
          if (faceDown) {
            return (
              <li
                key={jokerKeys[idx]}
                className="h-tile-h w-tile-w min-w-0 shrink rounded-lg border border-border bg-(--deck-back,var(--color-raised))"
                aria-label={t("a11y.faceDownJoker", {
                  position: idx + 1,
                  total: jokers.length,
                })}
                data-testid="joker-tile-face-down"
              />
            );
          }
          return (
            <Fragment key={jokerKeys[idx]}>
              {reorderable && renderGap(idx)}
              <JokerTile
                joker={joker}
                idx={idx}
                jokers={jokers}
                pulse={pulseCounters?.[joker.id] ?? 0}
                isDragging={draggingId === joker.id}
                draggable={tileDraggable}
                reorderable={reorderable}
                sellable={sellable}
                tooltipId={`${tooltipIdBase}-${joker.id}`}
                tooltipAnchorRect={tooltipOpenId === joker.id ? tooltipRect : null}
                onOpenTooltip={openTooltip}
                onCloseTooltip={closeTooltip}
                onMove={moveJoker}
                onSellAt={sellJokerAt}
                onTileDragStart={handleTileDragStart}
                onTileDragEnd={endDrag}
                sellAlwaysVisible={sellAlwaysVisible}
              />
            </Fragment>
          );
        })}
        {reorderable && jokers.length > 0 && renderGap(jokers.length)}
        {Array.from({ length: emptyCount }, (_, slotIndex) => (
          <Fragment key={`empty-${slotIndex}`}>
            {slotIndex > 0 && (
              <div
                className="w-1 shrink-0"
                data-joker-gap=""
                data-testid={`joker-gap-empty-${slotIndex}`}
                aria-hidden="true"
              />
            )}
            <li
              className={emptyTile}
              aria-label={t("a11y.emptyJokerSlot")}
              data-testid="joker-tile-empty"
            >
              Empty
            </li>
          </Fragment>
        ))}
      </ul>
    </Tray>
    </RenderProfiler>
  );
}
