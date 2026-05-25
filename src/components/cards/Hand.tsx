import { Fragment, useMemo, useState } from "react";
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
}

export default function Hand({
  hand,
  remaining,
  selectedIds,
  discardingIds,
  scoringId = null,
  onToggleCard,
  onCardDiscardEnd,
}: HandProps) {
  const [sortMode, setSortMode] = useState<SortMode>("rank");
  const [manualOrder, setManualOrder] = useState<ReadonlyArray<number> | null>(
    null,
  );
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [activeGapIndex, setActiveGapIndex] = useState<number | null>(null);

  const displayedHand = useMemo(
    () =>
      manualOrder ? applyManualOrder(hand, manualOrder) : sortCards(hand, sortMode),
    [hand, sortMode, manualOrder],
  );

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

  function insertAtIndex(sourceId: number, destIndex: number) {
    const currentOrder = displayedHand.map((c) => c.id);
    const fromIdx = currentOrder.indexOf(sourceId);
    if (fromIdx < 0) return;
    if (destIndex < 0 || destIndex > currentOrder.length) return;
    if (destIndex === fromIdx || destIndex === fromIdx + 1) return;
    const next = currentOrder.slice();
    next.splice(fromIdx, 1);
    const adjusted = destIndex > fromIdx ? destIndex - 1 : destIndex;
    next.splice(adjusted, 0, sourceId);
    setManualOrder(next);
  }

  function insertRelativeToTarget(sourceId: number, targetId: number) {
    if (sourceId === targetId) return;
    const currentOrder = displayedHand.map((c) => c.id);
    const fromIdx = currentOrder.indexOf(sourceId);
    const toIdx = currentOrder.indexOf(targetId);
    if (fromIdx < 0 || toIdx < 0) return;
    const next = currentOrder.slice();
    next.splice(fromIdx, 1);
    next.splice(toIdx, 0, sourceId);
    setManualOrder(next);
  }

  function endDrag() {
    setDraggingId(null);
    setActiveGapIndex(null);
  }

  function handleDragStart(cardId: number, e: React.DragEvent<HTMLDivElement>) {
    setDraggingId(cardId);
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(cardId));
    }
  }

  function handleGapDragOver(
    gapIndex: number,
    e: React.DragEvent<HTMLDivElement>,
  ) {
    if (draggingId === null) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
    if (activeGapIndex !== gapIndex) setActiveGapIndex(gapIndex);
  }

  function handleGapDragLeave(gapIndex: number) {
    if (activeGapIndex === gapIndex) setActiveGapIndex(null);
  }

  function handleGapDrop(
    gapIndex: number,
    e: React.DragEvent<HTMLDivElement>,
  ) {
    e.preventDefault();
    const raw = e.dataTransfer ? e.dataTransfer.getData("text/plain") : "";
    const draggedId =
      raw && !Number.isNaN(Number(raw)) ? Number(raw) : draggingId;
    if (draggedId !== null) {
      insertAtIndex(draggedId, gapIndex);
    }
    endDrag();
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
        <div className="hand-cards" aria-label="Your hand">
          {displayedHand.map((card, idx) => {
            const isDragging = draggingId === card.id;
            const slotClass = [
              "hand-card-slot",
              isDragging ? "hand-card-slot-dragging" : "",
            ]
              .filter(Boolean)
              .join(" ");
            const draggingIdx =
              draggingId !== null
                ? displayedHand.findIndex((c) => c.id === draggingId)
                : -1;
            const leftGapIsNoOp =
              draggingIdx >= 0 && (idx === draggingIdx || idx === draggingIdx + 1);
            const leftGapActive =
              activeGapIndex === idx && draggingId !== null && !leftGapIsNoOp;
            const leftGapClass = [
              "hand-card-gap",
              leftGapActive ? "hand-card-gap-active" : "",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <Fragment key={card.id}>
                <div
                  className={leftGapClass}
                  data-testid={`hand-gap-${idx}`}
                  aria-hidden="true"
                  onDragOver={(e) => handleGapDragOver(idx, e)}
                  onDragLeave={() => handleGapDragLeave(idx)}
                  onDrop={(e) => handleGapDrop(idx, e)}
                />
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
          {(() => {
            const lastIdx = displayedHand.length;
            const draggingIdx =
              draggingId !== null
                ? displayedHand.findIndex((c) => c.id === draggingId)
                : -1;
            const lastGapIsNoOp =
              draggingIdx >= 0 &&
              (lastIdx === draggingIdx || lastIdx === draggingIdx + 1);
            const lastGapActive =
              activeGapIndex === lastIdx &&
              draggingId !== null &&
              !lastGapIsNoOp;
            const lastGapClass = [
              "hand-card-gap",
              "hand-card-gap-trailing",
              lastGapActive ? "hand-card-gap-active" : "",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <div
                className={lastGapClass}
                data-testid={`hand-gap-${lastIdx}`}
                aria-hidden="true"
                onDragOver={(e) => handleGapDragOver(lastIdx, e)}
                onDragLeave={() => handleGapDragLeave(lastIdx)}
                onDrop={(e) => handleGapDrop(lastIdx, e)}
              />
            );
          })()}
        </div>
        <div className="hand-deck">
          <DeckPile remaining={remaining} />
        </div>
      </div>
    </div>
  );
}
