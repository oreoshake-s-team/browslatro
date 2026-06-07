import { Fragment, useEffect, useMemo, useReducer, useRef } from "react";
import "./Hand.css";
import Card from "./Card";
import DeckPile from "./DeckPile";
import type { Card as CardType } from "../../cards/types";
import { sortCards, type SortMode } from "../../cards/deck";

export const MAX_SELECTED = 5;

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

interface HandUiState {
  readonly sortMode: SortMode;
  readonly manualOrder: ReadonlyArray<number> | null;
  readonly draggingId: number | null;
  readonly dragOverGap: number | null;
}

type HandUiAction =
  | { readonly type: "selectSort"; readonly mode: SortMode }
  | { readonly type: "resetManualOrder" }
  | { readonly type: "reorder"; readonly order: ReadonlyArray<number> }
  | { readonly type: "dragStart"; readonly id: number }
  | { readonly type: "setDragOverGap"; readonly gap: number }
  | { readonly type: "clearDragOverGap"; readonly gap: number }
  | { readonly type: "endDrag" };

const initialHandUiState: HandUiState = {
  sortMode: "rank",
  manualOrder: null,
  draggingId: null,
  dragOverGap: null,
};

function handUiReducer(state: HandUiState, action: HandUiAction): HandUiState {
  switch (action.type) {
    // Choosing a sort always abandons any manual arrangement.
    case "selectSort":
      return { ...state, sortMode: action.mode, manualOrder: null };
    case "resetManualOrder":
      return state.manualOrder === null
        ? state
        : { ...state, manualOrder: null };
    case "reorder":
      return { ...state, manualOrder: action.order };
    case "dragStart":
      return { ...state, draggingId: action.id };
    case "setDragOverGap":
      return state.dragOverGap === action.gap
        ? state
        : { ...state, dragOverGap: action.gap };
    case "clearDragOverGap":
      return state.dragOverGap === action.gap
        ? { ...state, dragOverGap: null }
        : state;
    // Ending a drag clears both drag-tracking fields atomically.
    case "endDrag":
      return state.draggingId === null && state.dragOverGap === null
        ? state
        : { ...state, draggingId: null, dragOverGap: null };
    default:
      return state;
  }
}

interface HandProps {
  hand: ReadonlyArray<CardType>;
  remaining: ReadonlyArray<CardType>;
  selectedIds: ReadonlySet<number>;
  discardingIds: ReadonlySet<number>;
  debuffedIds?: ReadonlySet<number>;
  scoringId?: number | null;
  scoringPulseTick?: number;
  goldScoringId?: number | null;
  steelScoringId?: number | null;
  luckyMultProcIds?: ReadonlySet<number>;
  luckyMoneyProcIds?: ReadonlySet<number>;
  handPlaySignal?: number;
  onToggleCard: (card: CardType) => void;
  onCardDiscardEnd: (card: CardType) => void;
  onDisplayOrderChange?: (orderedIds: ReadonlyArray<number>) => void;
  consumableDropEnabled?: boolean;
  onConsumableSellDrop?: () => void;
  jokerDropEnabled?: boolean;
  onJokerSellDrop?: () => void;
}

export default function Hand({
  hand,
  remaining,
  selectedIds,
  discardingIds,
  debuffedIds,
  scoringId = null,
  scoringPulseTick = 0,
  goldScoringId = null,
  steelScoringId = null,
  luckyMultProcIds,
  luckyMoneyProcIds,
  handPlaySignal = 0,
  onToggleCard,
  onCardDiscardEnd,
  onDisplayOrderChange,
  consumableDropEnabled,
  onConsumableSellDrop,
  jokerDropEnabled,
  onJokerSellDrop,
}: HandProps) {
  const [{ sortMode, manualOrder, draggingId, dragOverGap }, dispatch] =
    useReducer(handUiReducer, initialHandUiState);
  const handCardsRef = useRef<HTMLDivElement | null>(null);
  const lastHandPlaySignalRef = useRef<number>(handPlaySignal);

  useEffect(() => {
    if (lastHandPlaySignalRef.current === handPlaySignal) return;
    lastHandPlaySignalRef.current = handPlaySignal;
    dispatch({ type: "resetManualOrder" });
  }, [handPlaySignal]);

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
    dispatch({ type: "selectSort", mode });
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
    dispatch({ type: "reorder", order: next });
  }

  function endDrag() {
    dispatch({ type: "endDrag" });
  }

  function handleDragStart(cardId: number, e: React.DragEvent<HTMLDivElement>) {
    dispatch({ type: "dragStart", id: cardId });
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
    dispatch({ type: "setDragOverGap", gap: gapIdx });
  }

  function handleGapDragLeave(gapIdx: number) {
    dispatch({ type: "clearDragOverGap", gap: gapIdx });
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
    if (gap !== null) dispatch({ type: "setDragOverGap", gap });
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
            title="Manual order (drag a card to rearrange)"
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
                    debuffed={debuffedIds?.has(card.id) ?? false}
                    scoring={scoringId === card.id}
                    scoringPulseTick={scoringPulseTick}
                    goldScoring={goldScoringId === card.id}
                    steelScoring={steelScoringId === card.id}
                    luckyMultScoring={luckyMultProcIds?.has(card.id) ?? false}
                    luckyMoneyScoring={luckyMoneyProcIds?.has(card.id) ?? false}
                    onToggle={onToggleCard}
                    onDiscardEnd={onCardDiscardEnd}
                  />
                </div>
              </Fragment>
            );
          })}
          {renderGap(displayedHand.length)}
        </div>
        <div className="hand-deck">
          <DeckPile
            remaining={remaining}
            consumableDropEnabled={consumableDropEnabled}
            onConsumableDrop={onConsumableSellDrop}
            jokerDropEnabled={jokerDropEnabled}
            onJokerDrop={onJokerSellDrop}
          />
        </div>
      </div>
    </div>
  );
}
