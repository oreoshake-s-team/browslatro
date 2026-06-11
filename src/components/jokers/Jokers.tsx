import { Fragment, useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  localizedJokerDescription,
  localizedJokerName,
} from "../../i18n/jokerOverrides";
import "./Jokers.css";
import {
  JOKER_EDITION_INFO,
  MAX_JOKERS,
  canSellJoker,
  effectiveJokerCount,
  isJokerActive,
  jokerSellValue,
  jokerStickers,
  type Joker,
} from "../../items/jokers";
import { insertIdAtIndex, nearestGapIndex } from "../../scoring/reordering";
import { announce } from "../system/LiveAnnouncer";
import { useMimeDropZone } from "../system/useMimeDropZone";
import { CONSUMABLE_DRAG_MIME } from "../consumables/Consumables";
import JokerEditionBadge from "./JokerEditionBadge";
import JokerStickerBadges from "./JokerStickerBadges";
import JokerTooltip from "./JokerTooltip";

export const JOKER_DRAG_MIME = "application/x-browslatro-joker";

interface JokersProps {
  jokers: ReadonlyArray<Joker>;
  capacity?: number;
  pulseCounters?: Readonly<Record<string, number>>;
  onReorder?: (orderedIds: ReadonlyArray<string>) => void;
  onSell?: (index: number) => void;
  onDragStart?: (index: number) => void;
  onDragEnd?: () => void;
  consumableDropEnabled?: boolean;
  onConsumableDrop?: () => void;
}

export default function Jokers({
  jokers,
  capacity = MAX_JOKERS,
  pulseCounters,
  onReorder,
  onSell,
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
  const reorderable = Boolean(onReorder);
  const sellable = Boolean(onSell);
  const tileDraggable = reorderable || sellable;

  useEffect(() => {
    if (tooltipOpenId === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setTooltipOpenId(null);
        setTooltipRect(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tooltipOpenId]);

  function openTooltip(id: string, el: HTMLElement) {
    setTooltipOpenId(id);
    setTooltipRect(el.getBoundingClientRect());
  }

  function closeTooltip(id: string) {
    setTooltipOpenId((prev) => {
      if (prev === id) {
        setTooltipRect(null);
        return null;
      }
      return prev;
    });
  }

  function endDrag() {
    setDraggingId(null);
    setActiveGapIndex(null);
    onDragEnd?.();
  }

  function applyDrop(sourceId: string, gapIdx: number) {
    if (!onReorder) return;
    const ids = jokers.map((j) => j.id);
    const next = insertIdAtIndex(ids, sourceId, gapIdx);
    if (next !== ids) onReorder(next);
  }

  function moveJoker(joker: Joker, idx: number, direction: -1 | 1) {
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
  }

  function sellJokerAt(joker: Joker, idx: number) {
    if (!onSell) return;
    announce(
      t("a11y.soldJoker", {
        name: localizedJokerName(i18n.language, joker.id, joker.name),
        value: jokerSellValue(joker),
      }),
    );
    onSell(idx);
  }

  function handleListDragOver(e: React.DragEvent<HTMLUListElement>) {
    if (draggingId === null) return;
    const target = e.target as HTMLElement | null;
    if (target?.classList?.contains("joker-gap")) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
    const gaps = listRef.current?.querySelectorAll<HTMLElement>(".joker-gap");
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
    <section
      className={`jokers${jokers.length === 0 ? " jokers-tray-empty" : ""}${
        showDropZone ? " jokers-consumable-target" : ""
      }${dropZone.hover ? " jokers-consumable-hover" : ""}`}
      style={{ "--joker-capacity": capacity } as React.CSSProperties}
      aria-label={t("a11y.equippedJokers")}
      data-testid="jokers-tray"
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
      <span className="jokers-label">{t("trays.jokers")}</span>
      <ul
        ref={listRef}
        className={`jokers-list${draggingId !== null ? " jokers-list-dragging" : ""}`}
        onDragOver={reorderable ? handleListDragOver : undefined}
        onDrop={reorderable ? handleListDrop : undefined}
      >
        {jokers.map((joker, idx) => {
          const pulse = pulseCounters?.[joker.id] ?? 0;
          const isDragging = draggingId === joker.id;
          const sellValue = jokerSellValue(joker);
          const jokerSellable = sellable && canSellJoker(joker);
          const debuffed = !isJokerActive(joker);
          const editionInfo = joker.edition ? JOKER_EDITION_INFO[joker.edition] : null;
          const editionClass = joker.edition
            ? ` joker-tile-edition joker-tile-edition-${joker.edition}`
            : "";
          const debuffedClass = debuffed ? " joker-tile-debuffed" : "";
          const editionLabel = editionInfo
            ? ` ${t("a11y.jokerEdition", {
                name: editionInfo.name,
                description: editionInfo.description,
              })}`
            : "";
          const debuffedLabel = debuffed ? ` ${t("a11y.jokerDebuffed")}` : "";
          const ariaLabel = jokerSellable
            ? `${joker.name}.${debuffedLabel} ${joker.description}.${editionLabel} ${t("a11y.sellHint", { value: sellValue })}`
            : editionInfo || sellable || debuffed
              ? `${joker.name}.${debuffedLabel} ${joker.description}.${editionLabel}`
              : undefined;
          const tooltipId = `${tooltipIdBase}-${joker.id}`;
          const tooltipOpen = tooltipOpenId === joker.id;
          return (
            <Fragment key={jokerKeys[idx]}>
              {reorderable && renderGap(idx)}
              <li
                className={`joker-tile${tileDraggable ? " joker-tile-draggable" : ""}${
                  isDragging ? " joker-tile-dragging" : ""
                }${editionClass}${debuffedClass}`}
                title={localizedJokerDescription(
                  i18n.language,
                  joker.id,
                  joker.description,
                )}
                aria-label={ariaLabel}
                aria-describedby={tooltipOpen ? tooltipId : undefined}
                tabIndex={0}
                data-testid={`joker-tile-filled-${joker.id}`}
                data-edition={joker.edition ?? undefined}
                data-debuffed={debuffed || undefined}
                draggable={tileDraggable || undefined}
                aria-grabbed={isDragging || undefined}
                onMouseEnter={(e) => openTooltip(joker.id, e.currentTarget)}
                onMouseLeave={() => closeTooltip(joker.id)}
                onFocus={(e) => openTooltip(joker.id, e.currentTarget)}
                onBlur={() => closeTooltip(joker.id)}
                onDragStart={
                  tileDraggable
                    ? (e) => {
                        setDraggingId(joker.id);
                        if (e.dataTransfer) {
                          e.dataTransfer.effectAllowed = "move";
                          e.dataTransfer.setData("text/plain", joker.id);
                          if (jokerSellable) {
                            e.dataTransfer.setData(JOKER_DRAG_MIME, String(idx));
                          }
                        }
                        onDragStart?.(idx);
                      }
                    : undefined
                }
                onDragEnd={tileDraggable ? endDrag : undefined}
                onClick={
                  jokerSellable
                    ? (e) => {
                        if (e.shiftKey) sellJokerAt(joker, idx);
                      }
                    : undefined
                }
              >
                <div
                  key={`pulse-${pulse}`}
                  className={
                    pulse > 0 ? "joker-tile-inner joker-tile-pulse" : "joker-tile-inner"
                  }
                  data-testid={`joker-tile-inner-${joker.id}`}
                  data-pulse={pulse}
                >
                  <span className="joker-tile-name">
                    {localizedJokerName(i18n.language, joker.id, joker.name)}
                  </span>
                  <span className="joker-tile-description">
                    {localizedJokerDescription(
                      i18n.language,
                      joker.id,
                      joker.description,
                    )}
                  </span>
                  {(joker.edition || jokerStickers(joker).length > 0) && (
                    <div className="joker-tile-badges">
                      {joker.edition && (
                        <JokerEditionBadge edition={joker.edition} />
                      )}
                      <JokerStickerBadges joker={joker} />
                    </div>
                  )}
                  {jokerSellable && isDragging && (
                    <span className="joker-tile-sell" aria-hidden="true">
                      Sell ${sellValue}
                    </span>
                  )}
                </div>
                {reorderable && (
                  <div className="joker-move-controls">
                    <button
                      type="button"
                      className="joker-move-button"
                      aria-label={t("a11y.moveLeft", {
                        item: localizedJokerName(i18n.language, joker.id, joker.name),
                      })}
                      data-testid={`joker-move-left-${joker.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        moveJoker(joker, idx, -1);
                      }}
                    >
                      ◀
                    </button>
                    <button
                      type="button"
                      className="joker-move-button"
                      aria-label={t("a11y.moveRight", {
                        item: localizedJokerName(i18n.language, joker.id, joker.name),
                      })}
                      data-testid={`joker-move-right-${joker.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        moveJoker(joker, idx, 1);
                      }}
                    >
                      ▶
                    </button>
                  </div>
                )}
                {jokerSellable && (
                  <button
                    type="button"
                    className="joker-sell-button"
                    aria-label={t("a11y.sellJoker", {
                      name: localizedJokerName(i18n.language, joker.id, joker.name),
                      value: sellValue,
                    })}
                    data-testid={`joker-sell-${joker.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      sellJokerAt(joker, idx);
                    }}
                  >
                    Sell ${sellValue}
                  </button>
                )}
                {tooltipOpen && tooltipRect && (
                  <JokerTooltip id={tooltipId} joker={joker} anchorRect={tooltipRect} />
                )}
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
              aria-label={t("a11y.emptyJokerSlot")}
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
