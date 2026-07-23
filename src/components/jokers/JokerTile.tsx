import { memo } from "react";
import { useTranslation } from "react-i18next";
import { localizedJokerName } from "../../i18n/jokerOverrides";
import "./Jokers.css";
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
import { tSuitName } from "../../i18n/strings";
import { useGame } from "../../store/game";
import JokerEditionBadge from "./JokerEditionBadge";
import JokerStickerBadges from "./JokerStickerBadges";
import JokerTooltip from "./JokerTooltip";

interface JokerTileProps {
  joker: Joker;
  idx: number;
  jokers: ReadonlyArray<Joker>;
  pulse: number;
  isDragging: boolean;
  draggable: boolean;
  reorderable: boolean;
  sellable: boolean;
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
  const todoHand = useGame((s) => s.todoHand);
  const castleSuit = useGame((s) => s.castleSuit);
  const idolTarget = useGame((s) => s.idolTarget);
  const castleSuitName = castleSuit ? tSuitName(t, castleSuit) : null;
  const idolRankName = idolTarget?.rank ?? null;
  const idolSuitName = idolTarget ? tSuitName(t, idolTarget.suit) : null;

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
  const tooltipOpen = tooltipAnchorRect !== null;

  return (
    <li
      className={`joker-tile${draggable ? " joker-tile-draggable" : ""}${
        isDragging ? " joker-tile--dragging" : ""
      }${editionClass}${debuffedClass}`}
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
        className={
          pulse > 0 ? "joker-tile-inner joker-tile-pulse" : "joker-tile-inner"
        }
        data-testid={`joker-tile-inner-${joker.id}`}
        data-pulse={pulse}
      >
        <span className="joker-tile-name">
          {localizedJokerName(i18n.language, joker.id, joker.name)}
        </span>
        <span
          className="joker-tile-description"
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
          <div className="joker-tile-badges">
            {joker.edition && <JokerEditionBadge edition={joker.edition} />}
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
              onMove(joker, idx, -1);
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
          className="joker-sell-button"
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
          Sell ${sellValue}
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
