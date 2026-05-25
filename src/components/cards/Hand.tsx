import { Fragment, useMemo, useRef, useState } from "react";
import "./Hand.css";
import Card from "./Card";
import DeckPile from "./DeckPile";
import type { Card as CardType, Suit } from "../../types";
import { sortCards, type SortMode } from "../../deck";

export const MAX_SELECTED = 5;

const SUIT_LABELS: Record<Suit, string> = {
  spades: "Spades",
  hearts: "Hearts",
  diamonds: "Diamonds",
  clubs: "Clubs",
};

function cardLabel(card: CardType): string {
  return `${card.rank} of ${SUIT_LABELS[card.suit]}`;
}

function applyManualOrder(
  hand: ReadonlyArray<CardType>,
  order: ReadonlyArray<number>,
): CardType[] {
  const byId = new Map(hand.map((c) => [c.id, c]));
  const result: CardType[] = [];
  for (const id of order) {
    const card = byId.get(id);
    if (card) {
      result.push(card);
      byId.delete(id);
    }
  }
  // Append any cards that weren't in the manual order yet (newly drawn).
  byId.forEach((card) => {
    result.push(card);
  });
  return result;
}

interface HandProps {
  hand: ReadonlyArray<CardType>;
  remaining: ReadonlyArray<CardType>;
  selectedIds: ReadonlySet<number>;
  discardingIds: ReadonlySet<number>;
  scoringId?: number | null;
  onToggleCard: (card: CardType) => void;
  onCardDiscardEnd: (card: CardType) => void;
  onDisplayOrderChange?: (orderedIds: ReadonlyArray<number>) => void;
}

export default function Hand({
  hand,
  remaining,
  selectedIds,
  discardingIds,
  scoringId = null,
  onToggleCard,
  onCardDiscardEnd,
  onDisplayOrderChange,
}: HandProps) {
  const [sortMode, setSortMode] = useState<SortMode>("rank");
  const [manualOrder, setManualOrder] = useState<ReadonlyArray<number> | null>(
    null,
  );
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragOverGap, setDragOverGap] = useState<number | null>(null);
  const handCardsRef = useRef<HTMLDivElement | null>(null);

  const displayedHand = useMemo(
    () =>
      manualOrder ? applyManualOrder(hand, manualOrder) : sortCards(hand, sortMode),
    [hand, sortMode, manualOrder],
  );

  useEffect(() => {
    if (!onDisplayOrderChange) return;
    onDisplayOrderChange(displayedHand.map((c) => c.id));
  }, [displayedHand, onDisplayOrderChange]);

  function selectSort(mode: SortMode) {
    setSortMode(mode);
    setManualOrder(null);
  }

  function swapByIds(aId: number, bId: number) {
    if (aId === bId) return;
    const currentOrder = displayedHand.map((c) => c.id);
    const fromIdx = currentOrder.indexOf(aId);
    const toIdx = currentOrder.indexOf(bId);
    if (fromIdx < 0 || toIdx < 0) return;
    const next = currentOrder.slice();
    [next[fromIdx], next[toIdx]] = [next[toIdx], next[fromIdx]];
    setManualOrder(next);
  }

  function moveCard(cardId: number, direction: -1 | 1) {
    const currentOrder = displayedHand.map((c) => c.id);
    const idx = currentOrder.indexOf(cardId);
    if (idx < 0) return;
    const target = idx + direction;
    if (target < 0 || target >= currentOrder.length) return;
    swapByIds(cardId, currentOrder[target]);
  }

  // Gap indices run 0..N where N = hand size; gap K is "before card K"
  // (and gap N is "after the last card"). Inserting source at gap K means
  // the source ends up at index K after removal — except when K is to the
  // right of source's old position, in which case the removal shifts the
  // target index left by one. Gaps adjacent to the source (K === fromIdx
  // or K === fromIdx + 1) are no-ops since the card would land where it
  // already is.
  function insertAtGap(sourceId: number, gapIdx: number) {
    const currentOrder = displayedHand.map((c) => c.id);
    const fromIdx = currentOrder.indexOf(sourceId);
    if (fromIdx < 0) return;
    if (gapIdx === fromIdx || gapIdx === fromIdx + 1) return;
    const next = currentOrder.slice();
    next.splice(fromIdx, 1);
    const insertIdx = gapIdx > fromIdx ? gapIdx - 1 : gapIdx;
    next.splice(insertIdx, 0, sourceId);
    setManualOrder(next);
  }

  function endDrag() {
    setDraggingId(null);
    setDragOverGap(null);
  }

  function handleDragStart(cardId: number, e: React.DragEvent<HTMLDivElement>) {
    setDraggingId(cardId);
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(cardId));
    }
  }

  function handleGapDragOver(
    gapIdx: number,
    e: React.DragEvent<HTMLDivElement>,
  ) {
    if (draggingId === null) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
    if (dragOverGap !== gapIdx) setDragOverGap(gapIdx);
  }

  function handleGapDragLeave(gapIdx: number) {
    if (dragOverGap === gapIdx) setDragOverGap(null);
  }

  function handleGapDrop(
    gapIdx: number,
    e: React.DragEvent<HTMLDivElement>,
  ) {
    e.preventDefault();
    e.stopPropagation();
    const raw = e.dataTransfer ? e.dataTransfer.getData("text/plain") : "";
    const draggedId =
      raw && !Number.isNaN(Number(raw)) ? Number(raw) : draggingId;
    if (draggedId !== null) {
      insertAtGap(draggedId, gapIdx);
    }
    endDrag();
  }

  // Compute the gap whose center is closest to a viewport X coordinate.
  // Lets the active drop zone follow the dragged card's position even
  // when the cursor isn't strictly inside a gap element (e.g. cursor
  // is hovering over a card slot but the dragged card image overlaps
  // a neighbouring gap).
  function gapNearestToClientX(clientX: number): number | null {
    const container = handCardsRef.current;
    if (!container) return null;
    const gaps = container.querySelectorAll<HTMLElement>(".hand-card-gap");
    let bestIdx: number | null = null;
    let bestDist = Number.POSITIVE_INFINITY;
    gaps.forEach((gap, i) => {
      const rect = gap.getBoundingClientRect();
      // jsdom returns zeroed rects for everything; skip resolving in that
      // case so unit tests can drive the per-gap handlers directly without
      // the container handler clobbering their setDragOverGap call.
      if (rect.width === 0 && rect.left === 0) return;
      const center = rect.left + rect.width / 2;
      const dist = Math.abs(clientX - center);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    });
    return bestIdx;
  }

  function handleHandDragOver(e: React.DragEvent<HTMLDivElement>) {
    if (draggingId === null) return;
    // Per-gap handlers fire first (event bubbles target → ancestors). If
    // the cursor is inside a gap element it already set the active gap;
    // we only need to compute the nearest gap when the cursor is over a
    // card slot or container background.
    const target = e.target as HTMLElement | null;
    if (target?.classList?.contains("hand-card-gap")) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
    const gap = gapNearestToClientX(e.clientX);
    if (gap !== null && dragOverGap !== gap) setDragOverGap(gap);
  }

  function handleHandDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    // Per-gap drop handlers stop propagation, so reaching here means the
    // drop happened over a card slot or the container itself. Use the
    // currently-resolved active gap, which the dragover handler keeps in
    // sync with the dragged card's geometric position.
    const raw = e.dataTransfer ? e.dataTransfer.getData("text/plain") : "";
    const draggedId =
      raw && !Number.isNaN(Number(raw)) ? Number(raw) : draggingId;
    if (draggedId !== null && dragOverGap !== null) {
      insertAtGap(draggedId, dragOverGap);
    }
    endDrag();
  }

  function renderGap(gapIdx: number) {
    const fromIdx =
      draggingId !== null
        ? displayedHand.findIndex((c) => c.id === draggingId)
        : -1;
    const isSelfAdjacent =
      fromIdx >= 0 && (gapIdx === fromIdx || gapIdx === fromIdx + 1);
    const isActive =
      draggingId !== null && dragOverGap === gapIdx && !isSelfAdjacent;
    const gapClass = ["hand-card-gap", isActive ? "hand-card-gap-active" : ""]
      .filter(Boolean)
      .join(" ");
    return (
      <div
        className={gapClass}
        data-testid={`hand-gap-${gapIdx}`}
        onDragOver={(e) => handleGapDragOver(gapIdx, e)}
        onDragLeave={() => handleGapDragLeave(gapIdx)}
        onDrop={(e) => handleGapDrop(gapIdx, e)}
        aria-hidden="true"
      />
    );
  }

  return (
    <div className="hand">
      <div className="hand-toolbar">
        <span className="hand-sort-label">Sort:</span>
        <div className="hand-sort-group" role="group" aria-label="Sort hand">
          <button
            type="button"
            className={`hand-sort-button ${
              !manualOrder && sortMode === "rank"
                ? "hand-sort-button-active"
                : ""
            }`.trim()}
            aria-pressed={!manualOrder && sortMode === "rank"}
            onClick={() => selectSort("rank")}
          >
            Rank
          </button>
          <button
            type="button"
            className={`hand-sort-button ${
              !manualOrder && sortMode === "suit"
                ? "hand-sort-button-active"
                : ""
            }`.trim()}
            aria-pressed={!manualOrder && sortMode === "suit"}
            onClick={() => selectSort("suit")}
          >
            Suit
          </button>
          <button
            type="button"
            className={`hand-sort-button ${
              manualOrder ? "hand-sort-button-active" : ""
            }`.trim()}
            aria-pressed={Boolean(manualOrder)}
            disabled={!manualOrder}
            aria-label="Manual order"
            title="Manual order (drag a card or use the arrows on each card to rearrange)"
          >
            Manual
          </button>
        </div>
      </div>
      <div className="hand-row">
        <div
          ref={handCardsRef}
          className={`hand-cards${
            draggingId !== null ? " hand-cards-dragging" : ""
          }`}
          aria-label="Your hand"
          onDragOver={handleHandDragOver}
          onDrop={handleHandDrop}
        >
          {displayedHand.map((card, idx) => {
            const isDragging = draggingId === card.id;
            const slotClass = [
              "hand-card-slot",
              isDragging ? "hand-card-slot-dragging" : "",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <Fragment key={card.id}>
                {renderGap(idx)}
                <div
                  className={slotClass}
                  draggable
                  aria-grabbed={isDragging || undefined}
                  data-testid={`hand-slot-${card.id}`}
                  onDragStart={(e) => handleDragStart(card.id, e)}
                  onDragEnd={endDrag}
                >
                  <Card
                    card={card}
                    selected={selectedIds.has(card.id)}
                    discarding={discardingIds.has(card.id)}
                    scoring={scoringId === card.id}
                    onToggle={onToggleCard}
                    onDiscardEnd={onCardDiscardEnd}
                  />
                  <div
                    className="hand-card-reorder"
                    role="group"
                    aria-label={`Reorder ${cardLabel(card)}`}
                  >
                    <button
                      type="button"
                      className="hand-card-reorder-button"
                      aria-label={`Move ${cardLabel(card)} left`}
                      disabled={idx === 0}
                      onClick={() => moveCard(card.id, -1)}
                    >
                      ◀
                    </button>
                    <button
                      type="button"
                      className="hand-card-reorder-button"
                      aria-label={`Move ${cardLabel(card)} right`}
                      disabled={idx === displayedHand.length - 1}
                      onClick={() => moveCard(card.id, 1)}
                    >
                      ▶
                    </button>
                  </div>
                </div>
              </Fragment>
            );
          })}
          {renderGap(displayedHand.length)}
        </div>
        <div className="hand-deck">
          <DeckPile remaining={remaining} />
        </div>
      </div>
    </div>
  );
}
