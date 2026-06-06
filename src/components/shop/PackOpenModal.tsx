import "./PackOpenModal.css";
import { useEffect, useMemo, useState } from "react";
import {
  type PackOffer,
  type PackOption,
  packDisplayName,
  packPickLimit,
} from "../../items/packs";
import type { Card as CardType } from "../../cards/types";
import { sortCards, type SortMode } from "../../cards/deck";
import { spectralNeedsTarget } from "../../items/spectrals";
import Card from "../cards/Card";
import { useEscapeToClose } from "../system/useEscapeToClose";

function applyManualOrder(
  hand: ReadonlyArray<CardType>,
  order: ReadonlyArray<number>,
): CardType[] {
  const byId = new Map(hand.map((c) => [c.id, c]));
  const seen = new Set<number>();
  const out: CardType[] = [];
  for (const id of order) {
    const c = byId.get(id);
    if (c && !seen.has(id)) {
      out.push(c);
      seen.add(id);
    }
  }
  for (const c of hand) {
    if (!seen.has(c.id)) out.push(c);
  }
  return out;
}

export interface PackOpenModalProps {
  pack: PackOffer;
  picksRemaining: number;
  pickedIndices?: ReadonlySet<number>;
  consumableSlotsFull?: boolean;
  jokerSlotsFull?: boolean;
  previewHand?: ReadonlyArray<CardType>;
  previewSelectedIds?: ReadonlySet<number>;
  onSelectPreviewCard?: (cardId: number) => void;
  onReorderPreview?: (orderedIds: ReadonlyArray<number>) => void;
  onPick: (optionIdx: number) => void;
  onClose: () => void;
}

interface OptionView {
  readonly id: string;
  readonly icon: string;
  readonly name: string;
  readonly description: string;
  readonly needsConsumableSlot: boolean;
  readonly needsJokerSlot: boolean;
  readonly requiresPreviewSelection?: { readonly maxTargets: 1 | 2 | 3 };
}

function describeOption(option: PackOption): OptionView | null {
  if (option.kind === "planet") {
    return {
      id: option.planet.id,
      icon: "🪐",
      name: option.planet.name,
      description: option.planet.description,
      needsConsumableSlot: false,
      needsJokerSlot: false,
    };
  }
  if (option.kind === "tarot") {
    const effect = option.tarot.effect;
    return {
      id: option.tarot.id,
      icon: "🃏",
      name: option.tarot.name,
      description: option.tarot.description,
      needsConsumableSlot: false,
      needsJokerSlot: false,
      requiresPreviewSelection:
        effect.kind === "apply-enhancement"
          ? { maxTargets: effect.maxTargets }
          : undefined,
    };
  }
  if (option.kind === "joker") {
    return {
      id: option.joker.id,
      icon: "🎭",
      name: option.joker.name,
      description: option.joker.description,
      needsConsumableSlot: false,
      needsJokerSlot: true,
    };
  }
  if (option.kind === "spectral") {
    const effect = option.spectral.effect;
    const appliesDirectlyToPreview = effect.kind === "duplicate-selected";
    return {
      id: option.spectral.id,
      icon: "👻",
      name: option.spectral.name,
      description: option.spectral.description,
      needsConsumableSlot:
        spectralNeedsTarget(effect) && !appliesDirectlyToPreview,
      needsJokerSlot: false,
      requiresPreviewSelection: appliesDirectlyToPreview
        ? { maxTargets: effect.maxTargets }
        : undefined,
    };
  }
  if (option.kind === "playing-card") {
    const c = option.card;
    const suitGlyph: Record<string, string> = {
      spades: "♠",
      hearts: "♥",
      diamonds: "♦",
      clubs: "♣",
    };
    const tags: string[] = [];
    if (c.enhancement) tags.push(c.enhancement);
    if (c.seal) tags.push(`${c.seal} seal`);
    return {
      id: String(c.id),
      icon: suitGlyph[c.suit] ?? "🂠",
      name: `${c.rank}${suitGlyph[c.suit] ?? ""}`,
      description: tags.length > 0 ? tags.join(", ") : "Add to your deck",
      needsConsumableSlot: false,
      needsJokerSlot: false,
    };
  }
  return null;
}

export default function PackOpenModal({
  pack,
  picksRemaining,
  pickedIndices,
  consumableSlotsFull = false,
  jokerSlotsFull = false,
  previewHand = [],
  previewSelectedIds,
  onSelectPreviewCard,
  onReorderPreview,
  onPick,
  onClose,
}: PackOpenModalProps) {
  useEscapeToClose(onClose, true);
  const [previewSortMode, setPreviewSortMode] = useState<SortMode>("rank");
  const [manualOrder, setManualOrder] = useState<ReadonlyArray<number> | null>(
    null,
  );
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const displayedPreviewHand = useMemo(
    () =>
      manualOrder
        ? applyManualOrder(previewHand, manualOrder)
        : sortCards(previewHand, previewSortMode),
    [previewHand, previewSortMode, manualOrder],
  );
  useEffect(() => {
    if (!onReorderPreview) return;
    onReorderPreview(displayedPreviewHand.map((c) => c.id));
  }, [displayedPreviewHand, onReorderPreview]);

  function selectPreviewSort(mode: SortMode) {
    setPreviewSortMode(mode);
    setManualOrder(null);
  }

  function reorderPreview(sourceId: number, targetId: number) {
    if (sourceId === targetId) return;
    const ids = displayedPreviewHand.map((c) => c.id);
    const fromIdx = ids.indexOf(sourceId);
    const toIdx = ids.indexOf(targetId);
    if (fromIdx < 0 || toIdx < 0) return;
    const next = ids.slice();
    next.splice(fromIdx, 1);
    const insertIdx = toIdx > fromIdx ? toIdx - 1 : toIdx;
    next.splice(insertIdx, 0, sourceId);
    setManualOrder(next);
  }
  const totalPicks = packPickLimit(pack.variant);
  const title = packDisplayName(pack);
  const selectedCount = previewSelectedIds?.size ?? 0;
  const subtitle =
    previewHand.length > 0 && selectedCount > 0
      ? `${selectedCount} preview card${selectedCount === 1 ? "" : "s"} selected — pick a tarot to apply`
      : totalPicks === 1
        ? "Pick 1 card to keep"
        : `Pick ${totalPicks} cards to keep (${picksRemaining} left)`;
  const closeLabel = picksRemaining < totalPicks ? "Done" : "Skip";

  return (
    <section
      className="pack-open-panel"
      role="region"
      aria-labelledby="pack-open-title"
    >
      <div className="pack-open-inner">
        <h2 id="pack-open-title" className="pack-open-title">
          🎁 {title}
        </h2>
        <p className="pack-open-subtitle" data-testid="pack-open-subtitle">
          {subtitle}
        </p>
        <ul className="pack-open-options" aria-label="Pack options">
          {pack.options.map((option, idx) => {
            if (pickedIndices?.has(idx)) return null;
            const view = describeOption(option);
            if (!view) return null;
            const noPicksLeft = picksRemaining <= 0;
            const consumableBlocked = view.needsConsumableSlot && consumableSlotsFull;
            const jokerBlocked = view.needsJokerSlot && jokerSlotsFull;
            const sel = view.requiresPreviewSelection;
            const hasPreviewHand = previewHand.length > 0;
            const selectionInvalid =
              sel !== undefined &&
              hasPreviewHand &&
              (selectedCount === 0 || selectedCount > sel.maxTargets);
            const disabled =
              noPicksLeft || consumableBlocked || jokerBlocked || selectionInvalid;
            const tooltip = noPicksLeft
              ? "No picks remaining"
              : consumableBlocked
                ? "Consumable slots are full"
                : jokerBlocked
                  ? "Joker slots are full"
                  : selectionInvalid
                    ? sel.maxTargets === 1
                      ? selectedCount === 0
                        ? "Select 1 card in the preview hand first"
                        : "Too many cards selected (max 1)"
                      : selectedCount === 0
                        ? `Select 1–${sel.maxTargets} cards in the preview hand first`
                        : `Too many cards selected (max ${sel.maxTargets})`
                    : undefined;
            return (
              <li key={`${view.id}-${idx}`} className="pack-open-option">
                <span className="pack-open-option-icon" aria-hidden="true">{view.icon}</span>
                <span className="pack-open-option-name">{view.name}</span>
                <span className="pack-open-option-description">
                  {view.description}
                </span>
                <button
                  type="button"
                  className="pack-open-option-pick"
                  data-testid={`pack-open-pick-${idx}`}
                  disabled={disabled}
                  title={tooltip}
                  aria-label={`Pick ${view.name}`}
                  onClick={() => onPick(idx)}
                >
                  Pick
                </button>
              </li>
            );
          })}
        </ul>
        {previewHand.length > 0 && (
          <>
            <div
              className="pack-open-preview-sort"
              role="group"
              aria-label="Sort preview hand"
            >
              <span className="pack-open-preview-sort-label">Sort:</span>
              <button
                type="button"
                className={`pack-open-preview-sort-button${
                  previewSortMode === "rank"
                    ? " pack-open-preview-sort-button-active"
                    : ""
                }`}
                data-testid="pack-open-preview-sort-rank"
                aria-pressed={previewSortMode === "rank"}
                onClick={() => selectPreviewSort("rank")}
              >
                Rank
              </button>
              <button
                type="button"
                className={`pack-open-preview-sort-button${
                  previewSortMode === "suit"
                    ? " pack-open-preview-sort-button-active"
                    : ""
                }`}
                data-testid="pack-open-preview-sort-suit"
                aria-pressed={previewSortMode === "suit"}
                onClick={() => selectPreviewSort("suit")}
              >
                Suit
              </button>
            </div>
            <div
              className="pack-open-preview-hand"
              data-testid="pack-open-preview-hand"
              aria-label="Preview hand"
            >
              {displayedPreviewHand.map((card) => (
                <div
                  key={card.id}
                  className={`pack-open-preview-card${
                    draggingId === card.id ? " pack-open-preview-card-dragging" : ""
                  }`}
                  data-testid={`pack-open-preview-card-${card.id}`}
                  draggable
                  onDragStart={(e) => {
                    setDraggingId(card.id);
                    if (e.dataTransfer) {
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", String(card.id));
                    }
                  }}
                  onDragOver={(e) => {
                    if (draggingId === null) return;
                    e.preventDefault();
                    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const raw = e.dataTransfer?.getData("text/plain") ?? "";
                    const sourceId =
                      raw && !Number.isNaN(Number(raw))
                        ? Number(raw)
                        : draggingId;
                    if (sourceId !== null) reorderPreview(sourceId, card.id);
                    setDraggingId(null);
                  }}
                  onDragEnd={() => setDraggingId(null)}
                >
                  <Card
                    card={card}
                    selected={previewSelectedIds?.has(card.id) ?? false}
                    onToggle={
                      onSelectPreviewCard
                        ? () => onSelectPreviewCard(card.id)
                        : undefined
                    }
                  />
                </div>
              ))}
            </div>
          </>
        )}
        <button
          type="button"
          className="pack-open-close"
          data-testid="pack-open-close"
          onClick={onClose}
        >
          {closeLabel}
        </button>
      </div>
    </section>
  );
}
