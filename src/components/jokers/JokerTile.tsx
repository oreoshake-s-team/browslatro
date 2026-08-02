import { memo } from "react";
import { useTranslation } from "react-i18next";
import { localizedJokerName } from "../../i18n/jokerOverrides";
import {
  JOKER_EDITION_INFO,
  canSellJoker,
  isJokerActive,
  jokerSellValue,
  jokerStickers,
  type Joker,
} from "../../items/jokers";
import {
  dynamicJokerDescriptionNode,
  dynamicJokerDescriptionText,
} from "../../items/jokers/dynamicJokerDescription";
import { formatSellLabel } from "../system/sellLabel";
import { cn, tile } from "../ui/Tile";
import JokerEditionBadge from "./JokerEditionBadge";
import JokerStickerBadges from "./JokerStickerBadges";
import JokerTooltip from "./JokerTooltip";
import { useJokerDescriptionContext } from "./useJokerDescriptionContext";

const EDITION_RING = {
  none: "",
  foil: "ring-2 ring-chips ring-inset",
  holographic: "ring-2 ring-advisor ring-inset",
  polychrome: "ring-2 ring-success ring-inset",
  negative: "bg-black ring-2 ring-white/60 ring-inset",
} as const;

const MOVE_BUTTON =
  "cursor-pointer rounded-md bg-hover px-1.5 text-xs text-ink hover:bg-chips focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

interface JokerTileProps {
  joker: Joker;
  idx: number;
  jokers: ReadonlyArray<Joker>;
  pulse: number;
  isDragging: boolean;
  draggable: boolean;
  reorderable: boolean;
  sellable: boolean;
  sellAlwaysVisible?: boolean;
  tooltipId: string;
  tooltipAnchorRect: DOMRect | null;
  onOpenTooltip: (id: string, el: HTMLElement) => void;
  onCloseTooltip: (id: string) => void;
  onMove: (joker: Joker, idx: number, direction: -1 | 1) => void;
  onSellAt: (joker: Joker, idx: number) => void;
  onTileDragStart: (
    e: React.DragEvent<HTMLLIElement>,
    joker: Joker,
    idx: number,
    sellableNow: boolean,
  ) => void;
  onTileDragEnd: () => void;
}

function JokerTile({
  joker,
  idx,
  jokers,
  pulse,
  isDragging,
  draggable,
  reorderable,
  sellable,
  sellAlwaysVisible = false,
  tooltipId,
  tooltipAnchorRect,
  onOpenTooltip,
  onCloseTooltip,
  onMove,
  onSellAt,
  onTileDragStart,
  onTileDragEnd,
}: JokerTileProps) {
  const { t, i18n } = useTranslation();
  const { todoHand, castleSuit, castleSuitName, idolRankName, idolSuitName } =
    useJokerDescriptionContext();

  const sellValue = jokerSellValue(joker);
  const jokerSellable = sellable && canSellJoker(joker);
  const debuffed = !isJokerActive(joker);
  const editionInfo = joker.edition ? JOKER_EDITION_INFO[joker.edition] : null;
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
  const tooltipOpen = tooltipAnchorRect !== null;

  return (
    <li
      className={cn(
        tile({ accent: "mult", interactive: draggable, dimmed: debuffed }),
        "group relative",
        EDITION_RING[joker.edition ?? "none"],
        isDragging && "opacity-40",
      )}
      title={dynamicJokerDescriptionText({
        language: i18n.language,
        jokerId: joker.id,
        description: joker.description,
        todoHand,
        castleSuit,
        castleSuitName,
        idolRankName,
        idolSuitName,
      })}
      aria-label={ariaLabel}
      aria-describedby={tooltipOpen ? tooltipId : undefined}
      tabIndex={0}
      data-testid={`joker-tile-filled-${joker.id}`}
      data-edition={joker.edition ?? undefined}
      data-debuffed={debuffed || undefined}
      draggable={draggable || undefined}
      aria-grabbed={isDragging || undefined}
      onMouseEnter={(e) => onOpenTooltip(joker.id, e.currentTarget)}
      onMouseLeave={() => onCloseTooltip(joker.id)}
      onFocus={(e) => onOpenTooltip(joker.id, e.currentTarget)}
      onBlur={() => onCloseTooltip(joker.id)}
      onDragStart={
        draggable
          ? (e) => onTileDragStart(e, joker, idx, jokerSellable)
          : undefined
      }
      onDragEnd={draggable ? onTileDragEnd : undefined}
      onClick={
        jokerSellable
          ? (e) => {
              if (e.shiftKey) onSellAt(joker, idx);
            }
          : undefined
      }
    >
      <div
        key={`pulse-${pulse}`}
        className={cn(
          "flex h-full min-w-0 flex-col gap-1",
          pulse > 0 && "animate-pulse-flash",
        )}
        data-testid={`joker-tile-inner-${joker.id}`}
        data-pulse={pulse}
      >
        <span className="truncate font-bold" data-joker-name="">
          {localizedJokerName(i18n.language, joker.id, joker.name)}
        </span>
        <span
          className="line-clamp-3 text-muted"
          data-testid={`joker-tile-description-${joker.id}`}
        >
          {dynamicJokerDescriptionNode({
            language: i18n.language,
            jokerId: joker.id,
            description: joker.description,
            todoHand,
            castleSuit,
            castleSuitName,
            idolRankName,
            idolSuitName,
          })}
        </span>
        {(joker.edition || jokerStickers(joker).length > 0) && (
          <div className="mt-auto flex flex-wrap items-center gap-1" data-joker-badges="">
            {joker.edition && <JokerEditionBadge edition={joker.edition} />}
            <JokerStickerBadges joker={joker} />
          </div>
        )}
        {jokerSellable && isDragging && (
          <span
            className="font-semibold text-money"
            data-joker-sell-chip=""
            aria-hidden="true"
          >
            {formatSellLabel(sellValue)}
          </span>
        )}
      </div>
      {reorderable && (
        <div className="absolute inset-x-1 bottom-1 z-10 hidden justify-between group-focus-within:flex group-hover:flex">
          <button
            type="button"
            className={MOVE_BUTTON}
            aria-label={t("a11y.moveLeft", {
              item: localizedJokerName(i18n.language, joker.id, joker.name),
            })}
            data-testid={`joker-move-left-${joker.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onMove(joker, idx, -1);
            }}
          >
            ◀
          </button>
          <button
            type="button"
            className={MOVE_BUTTON}
            aria-label={t("a11y.moveRight", {
              item: localizedJokerName(i18n.language, joker.id, joker.name),
            })}
            data-testid={`joker-move-right-${joker.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onMove(joker, idx, 1);
            }}
          >
            ▶
          </button>
        </div>
      )}
      {jokerSellable && (
        <button
          type="button"
          className={cn(
            "absolute top-1 right-1 z-10 cursor-pointer rounded-md bg-money px-1.5 py-0.5 text-xs font-bold text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
            !sellAlwaysVisible &&
              "hidden group-focus-within:inline-flex group-hover:inline-flex",
          )}
          aria-label={t("a11y.sellJoker", {
            name: localizedJokerName(i18n.language, joker.id, joker.name),
            value: sellValue,
          })}
          data-testid={`joker-sell-${joker.id}`}
          onClick={(e) => {
            e.stopPropagation();
            onSellAt(joker, idx);
          }}
        >
          {formatSellLabel(sellValue)}
        </button>
      )}
      {tooltipOpen && (
        <JokerTooltip
          id={tooltipId}
          joker={joker}
          jokers={jokers}
          jokerIndex={idx}
          anchorRect={tooltipAnchorRect}
        />
      )}
    </li>
  );
}

export default memo(JokerTile);
