import {
  Suspense,
  lazy,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
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
import CardModifierBadges, {
  CARD_EDITION_LABEL_KEY,
  ENHANCEMENT_LABEL_KEY,
  JOKER_EDITION_LABEL_KEY,
  SEAL_LABEL_KEY,
} from "../cards/CardModifierBadges";
import JokerStickerBadges from "../jokers/JokerStickerBadges";
import { announce } from "../system/LiveAnnouncer";
import Modal from "../system/Modal";
import { cardName } from "../../i18n/strings";
import { Button } from "../ui/Button";
import { cn } from "../ui/cn";

const MOVE_BUTTON =
  "cursor-pointer rounded-md bg-hover px-1.5 py-1 text-xs leading-none text-ink hover:bg-chips focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

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
  playArea?: ReactNode;
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
  readonly card?: CardType;
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
      needsJokerSlot: option.joker.edition !== "negative",
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
    return {
      id: String(c.id),
      icon: suitGlyph[c.suit] ?? "🂠",
      name: `${c.rank}${suitGlyph[c.suit] ?? ""}`,
      description: t("pack.addToDeck"),
      needsConsumableSlot: false,
      needsJokerSlot: false,
      card: c,
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
  playArea,
}: PackOpenModalProps) {
  const { t, i18n } = useTranslation();
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
  const packOffersJoker = pack.options.some(
    (option) => option.kind === "joker",
  );
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
    <Modal
      onClose={onClose}
      labelledBy="pack-open-title"
      accent="pack"
      size="lg"
      className="max-w-225!"
      testId="pack-open-modal"
    >
        {playArea && (
          <div
            className="flex flex-col gap-4 border-b border-border pb-4"
            data-testid="pack-open-play-area"
          >
            {playArea}
          </div>
        )}
        <h2 id="pack-open-title" className="text-xl font-bold">
          <span aria-hidden="true">🎁 </span>
          {title}
        </h2>
        <p className="text-muted" data-testid="pack-open-subtitle">
          {subtitle}
        </p>
        {jokerSlotsFull && packOffersJoker && (
          <p
            className="self-start rounded-lg border border-money/40 bg-money/10 px-3 py-1 text-xs font-semibold text-money"
            role="status"
            data-testid="pack-open-sell-hint"
          >
            <span aria-hidden="true">💰 </span>
            {t("pack.jokerSlotsFullSellHint")}
          </p>
        )}
        <ul
          className="flex flex-wrap justify-evenly gap-3"
          data-testid="pack-open-options"
          aria-label={t("a11y.packOptions")}
        >
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
            const modifierLabels: string[] = [];
            if (view.card?.enhancement)
              modifierLabels.push(t(ENHANCEMENT_LABEL_KEY[view.card.enhancement]));
            if (view.card?.edition)
              modifierLabels.push(t(CARD_EDITION_LABEL_KEY[view.card.edition]));
            if (view.card?.seal)
              modifierLabels.push(t(SEAL_LABEL_KEY[view.card.seal]));
            if (view.joker?.edition)
              modifierLabels.push(t(JOKER_EDITION_LABEL_KEY[view.joker.edition]));
            const nameForAria =
              modifierLabels.length > 0
                ? t("a11y.cardWithDetail", {
                    name: view.name,
                    detail: modifierLabels.join(", "),
                  })
                : view.name;
            const pickAriaLabel = stickerNames
              ? t("a11y.pickOptionWith", { name: nameForAria, stickers: stickerNames })
              : t("a11y.pickOption", { name: nameForAria });
            return (
              <li
                key={`${view.id}-${idx}`}
                className="grid w-32 grid-rows-[auto_auto_1fr_auto] gap-1 rounded-lg border border-money/40 bg-money/10 p-3"
                data-pack-option=""
                title={stickerHover}
              >
                <span className="self-start text-xl" aria-hidden="true">{view.icon}</span>
                <span className="text-sm font-bold" data-pack-option-name="">{view.name}</span>
                <span className="text-xs text-muted" data-pack-option-description="">
                  {appendFoolHint(view.description, view.id, foolCopyTarget)}
                </span>
                {modifierLabels.length > 0 && (
                  <span className="flex flex-wrap justify-center gap-1">
                    <CardModifierBadges
                      scope="pack"
                      suffix={idx}
                      enhancement={view.card?.enhancement}
                      cardEdition={view.card?.edition}
                      seal={view.card?.seal}
                      jokerEdition={view.joker?.edition}
                    />
                  </span>
                )}
                {view.joker && <JokerStickerBadges joker={view.joker} />}
                <Button
                  variant="primary"
                  size="sm"
                  data-testid={`pack-open-pick-${idx}`}
                  disabled={disabled}
                  title={tooltip}
                  aria-label={pickAriaLabel}
                  onClick={() => onPick(idx)}
                >
                  {t("pack.pick")}
                </Button>
              </li>
            );
          })}
        </ul>
        {previewHand.length > 0 && (
          <>
            <div
              className="flex items-center justify-center gap-1"
              role="group"
              aria-label={t("a11y.sortPreviewHand")}
            >
              <span className="text-xs tracking-wider text-muted uppercase">
                {t("pack.sortLabel")}
              </span>
              <Button
                variant="toggle"
                size="sm"
                data-testid="pack-open-preview-sort-rank"
                aria-pressed={previewSortMode === "rank"}
                onClick={() => selectPreviewSort("rank")}
              >
                {t("pack.sortRank")}
              </Button>
              <Button
                variant="toggle"
                size="sm"
                data-testid="pack-open-preview-sort-suit"
                aria-pressed={previewSortMode === "suit"}
                onClick={() => selectPreviewSort("suit")}
              >
                {t("pack.sortSuit")}
              </Button>
            </div>
            <div
              className="flex shrink-0 items-end justify-center-safe gap-1 overflow-x-auto rounded-lg border-2 border-dashed border-border bg-bg px-2 pt-6 pb-2"
              data-testid="pack-open-preview-hand"
              aria-label={t("a11y.previewHand")}
            >
              {displayedPreviewHand.map((card) => (
                <div
                  key={card.id}
                  className={cn(
                    "group/preview relative flex min-w-0 shrink-0 cursor-grab active:cursor-grabbing",
                    draggingId === card.id && "opacity-50",
                  )}
                  data-testid={`pack-open-preview-card-${card.id}`}
                  data-dragging={draggingId === card.id || undefined}
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
                  <div className="pointer-events-none absolute -top-6 left-1/2 z-10 flex -translate-x-1/2 gap-0.5 opacity-0 group-focus-within/preview:pointer-events-auto group-focus-within/preview:opacity-100">
                    <button
                      type="button"
                      className={MOVE_BUTTON}
                      aria-label={t("a11y.moveLeft", { item: cardName(t, card) })}
                      data-testid={`pack-open-preview-move-left-${card.id}`}
                      onClick={() => movePreviewCard(card, -1)}
                    >
                      ◀
                    </button>
                    <button
                      type="button"
                      className={MOVE_BUTTON}
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
        <div
          className="flex flex-wrap items-center justify-end gap-3 self-end"
          data-testid="pack-open-actions"
        >
          <div className="contents" ref={setSuggestSlot} />
          <Button data-testid="pack-open-close" onClick={onClose}>
            {closeLabel}
          </Button>
        </div>
    </Modal>
  );
}
