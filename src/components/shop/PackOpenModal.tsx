import "./PackOpenModal.css";
import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import {
  localizedConsumableDescription,
  localizedConsumableName,
} from "../../i18n/contentOverrides";
import { appendFoolHint } from "../../i18n/foolCopyTarget";
import {
  localizedJokerDescription,
  localizedJokerName,
} from "../../i18n/jokerOverrides";
import {
  type PackOffer,
  type PackOption,
  packDisplayName,
  packPickLimit,
} from "../../items/packs";
import type { Card as CardType } from "../../cards/types";
import { sortCards, type SortMode } from "../../cards/deck";
import { spectralNeedsTarget } from "../../items/spectrals";
import {
  JOKER_STICKER_INFO,
  PERISHABLE_LIFE,
  jokerStickers,
  type Joker,
} from "../../items/jokers";
import Card from "../cards/Card";
import JokerStickerBadges from "../jokers/JokerStickerBadges";
import { announce } from "../system/LiveAnnouncer";
import { useEscapeToClose } from "../system/useEscapeToClose";
import { cardName } from "../../i18n/strings";

const PackSuggestion = lazy(() => import("./PackSuggestion"));

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
  foolCopyTarget?: string;
}

interface OptionView {
  readonly id: string;
  readonly icon: string;
  readonly name: string;
  readonly description: string;
  readonly needsConsumableSlot: boolean;
  readonly needsJokerSlot: boolean;
  readonly requiresPreviewSelection?: { readonly maxTargets: 1 | 2 | 3 };
  readonly joker?: Joker;
}

function stickerSummary(joker: Joker): string {
  return jokerStickers(joker)
    .map((s) => JOKER_STICKER_INFO[s.kind].name)
    .join(", ");
}

function stickerTooltip(joker: Joker): string {
  return jokerStickers(joker)
    .map((s) => {
      const info = JOKER_STICKER_INFO[s.kind];
      if (s.kind === "perishable") {
        if (s.roundsHeld >= PERISHABLE_LIFE) return `${info.name} — debuffed`;
        const remaining = PERISHABLE_LIFE - s.roundsHeld;
        return `${info.name} — ${remaining} of ${PERISHABLE_LIFE} rounds left`;
      }
      return `${info.name} — ${info.description}`;
    })
    .join("\n");
}

function describeOption(
  t: TFunction,
  locale: string,
  option: PackOption,
): OptionView | null {
  if (option.kind === "planet") {
    return {
      id: option.planet.id,
      icon: "🪐",
      name: localizedConsumableName(locale, option.planet.id, option.planet.name),
      description: localizedConsumableDescription(
        locale,
        option.planet.id,
        option.planet.description,
      ),
      needsConsumableSlot: false,
      needsJokerSlot: false,
    };
  }
  if (option.kind === "tarot") {
    const effect = option.tarot.effect;
    return {
      id: option.tarot.id,
      icon: "🃏",
      name: localizedConsumableName(locale, option.tarot.id, option.tarot.name),
      description: localizedConsumableDescription(
        locale,
        option.tarot.id,
        option.tarot.description,
      ),
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
      name: localizedJokerName(locale, option.joker.id, option.joker.name),
      description: localizedJokerDescription(
        locale,
        option.joker.id,
        option.joker.description,
      ),
      needsConsumableSlot: false,
      needsJokerSlot: true,
      joker: option.joker,
    };
  }
  if (option.kind === "spectral") {
    const effect = option.spectral.effect;
    const appliesDirectlyToPreview = effect.kind === "duplicate-selected";
    return {
      id: option.spectral.id,
      icon: "👻",
      name: localizedConsumableName(locale, option.spectral.id, option.spectral.name),
      description: localizedConsumableDescription(
        locale,
        option.spectral.id,
        option.spectral.description,
      ),
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
      description: tags.length > 0 ? tags.join(", ") : t("pack.addToDeck"),
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
  foolCopyTarget,
}: PackOpenModalProps) {
  const { t, i18n } = useTranslation();
  useEscapeToClose(onClose, true);
  const [previewSortMode, setPreviewSortMode] = useState<SortMode>("rank");
  const [manualOrder, setManualOrder] = useState<ReadonlyArray<number> | null>(
    null,
  );
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [suggestSlot, setSuggestSlot] = useState<HTMLDivElement | null>(null);
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

  function movePreviewCard(card: CardType, direction: -1 | 1) {
    const ids = displayedPreviewHand.map((c) => c.id);
    const idx = ids.indexOf(card.id);
    if (idx < 0) return;
    const name = cardName(t, card);
    if (direction === -1 && idx === 0) {
      announce(t("a11y.atStart", { item: name }));
      return;
    }
    if (direction === 1 && idx === ids.length - 1) {
      announce(t("a11y.atEnd", { item: name }));
      return;
    }
    const next = ids.slice();
    next.splice(idx, 1);
    next.splice(idx + direction, 0, card.id);
    setManualOrder(next);
    announce(
      t("a11y.movedTo", {
        item: name,
        position: idx + direction + 1,
        total: ids.length,
      }),
    );
  }

  const totalPicks = packPickLimit(pack.variant);
  const title = packDisplayName(pack);
  const selectedCount = previewSelectedIds?.size ?? 0;
  const subtitle =
    previewHand.length > 0 && selectedCount > 0
      ? selectedCount === 1
        ? t("pack.previewSelectedOne")
        : t("pack.previewSelectedMany", { count: selectedCount })
      : totalPicks === 1
        ? t("pack.pickOneToKeep")
        : t("pack.pickManyToKeep", {
            total: totalPicks,
            remaining: picksRemaining,
          });
  const closeLabel =
    picksRemaining < totalPicks ? t("pack.done") : t("pack.skip");

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
        <ul className="pack-open-options" aria-label={t("a11y.packOptions")}>
          {pack.options.map((option, idx) => {
            if (pickedIndices?.has(idx)) return null;
            const view = describeOption(t, i18n.language, option);
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
              ? t("pack.noPicksRemaining")
              : consumableBlocked
                ? t("pack.consumableSlotsFull")
                : jokerBlocked
                  ? t("pack.jokerSlotsFull")
                  : selectionInvalid
                    ? sel.maxTargets === 1
                      ? selectedCount === 0
                        ? t("pack.selectOneFirst")
                        : t("pack.tooManySelectedMaxOne")
                      : selectedCount === 0
                        ? t("pack.selectRangeFirst", { max: sel.maxTargets })
                        : t("pack.tooManySelectedMax", { max: sel.maxTargets })
                    : undefined;
            const stickerNames =
              view.joker && jokerStickers(view.joker).length > 0
                ? stickerSummary(view.joker)
                : "";
            const stickerHover =
              view.joker && jokerStickers(view.joker).length > 0
                ? stickerTooltip(view.joker)
                : undefined;
            const pickAriaLabel = stickerNames
              ? t("a11y.pickOptionWith", { name: view.name, stickers: stickerNames })
              : t("a11y.pickOption", { name: view.name });
            return (
              <li
                key={`${view.id}-${idx}`}
                className="pack-open-option"
                title={stickerHover}
              >
                <span className="pack-open-option-icon" aria-hidden="true">{view.icon}</span>
                <span className="pack-open-option-name">{view.name}</span>
                <span className="pack-open-option-description">
                  {appendFoolHint(view.description, view.id, foolCopyTarget)}
                </span>
                {view.joker && <JokerStickerBadges joker={view.joker} />}
                <button
                  type="button"
                  className="btn btn--primary pack-open-option-pick"
                  data-testid={`pack-open-pick-${idx}`}
                  disabled={disabled}
                  title={tooltip}
                  aria-label={pickAriaLabel}
                  onClick={() => onPick(idx)}
                >
                  {t("pack.pick")}
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
              aria-label={t("a11y.sortPreviewHand")}
            >
              <span className="pack-open-preview-sort-label">
                {t("pack.sortLabel")}
              </span>
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
                {t("pack.sortRank")}
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
                {t("pack.sortSuit")}
              </button>
            </div>
            <div
              className="pack-open-preview-hand"
              data-testid="pack-open-preview-hand"
              aria-label={t("a11y.previewHand")}
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
                  <div className="pack-open-preview-move-controls">
                    <button
                      type="button"
                      className="pack-open-preview-move-button"
                      aria-label={t("a11y.moveLeft", { item: cardName(t, card) })}
                      data-testid={`pack-open-preview-move-left-${card.id}`}
                      onClick={() => movePreviewCard(card, -1)}
                    >
                      ◀
                    </button>
                    <button
                      type="button"
                      className="pack-open-preview-move-button"
                      aria-label={t("a11y.moveRight", { item: cardName(t, card) })}
                      data-testid={`pack-open-preview-move-right-${card.id}`}
                      onClick={() => movePreviewCard(card, 1)}
                    >
                      ▶
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        <Suspense fallback={null}>
          <PackSuggestion
            pack={pack}
            picksRemaining={picksRemaining}
            pickedIndices={pickedIndices ?? new Set()}
            jokerSlotsFull={jokerSlotsFull}
            consumableSlotsFull={consumableSlotsFull}
            onPick={onPick}
            onClose={onClose}
            triggerContainer={suggestSlot}
          />
        </Suspense>
        <div className="pack-open-actions">
          <div className="pack-suggest-slot" ref={setSuggestSlot} />
          <button
            type="button"
            className="btn btn--secondary pack-open-close"
            data-testid="pack-open-close"
            onClick={onClose}
          >
            {closeLabel}
          </button>
        </div>
      </div>
    </section>
  );
}
