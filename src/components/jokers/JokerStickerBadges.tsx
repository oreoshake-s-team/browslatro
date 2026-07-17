import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import {
  JOKER_STICKER_INFO,
  PERISHABLE_LIFE,
  jokerStickers,
  type Joker,
  type JokerSticker,
} from "../../items/jokers";
import { cx } from "../../styles/cx";

interface JokerStickerBadgesProps {
  readonly joker: Joker;
}

const STICKER_LETTER: Readonly<Record<JokerSticker["kind"], string>> = {
  eternal: "E",
  perishable: "P",
  rental: "R",
};

const BADGE_BASE =
  "inline-flex h-[1.1rem] min-w-[1.1rem] items-center justify-center rounded-pill border border-solid border-black/25 px-[0.35rem] text-[0.7rem] leading-none font-bold text-white";

const STICKER_BADGE_VARIANT: Readonly<Record<JokerSticker["kind"], string>> = {
  eternal: "bg-joker-sticker-eternal",
  perishable: "bg-joker-sticker-perishable",
  rental: "bg-joker-sticker-rental",
};

const DEBUFFED_VARIANT = "bg-joker-sticker-debuffed line-through opacity-85";

function isDebuffed(sticker: JokerSticker): boolean {
  return (
    sticker.kind === "perishable" && sticker.roundsHeld >= PERISHABLE_LIFE
  );
}

export default function JokerStickerBadges({ joker }: JokerStickerBadgesProps) {
  const { t } = useTranslation();
  const stickers = jokerStickers(joker);
  if (stickers.length === 0) return null;
  return (
    <ul
      className="m-0 mt-[0.3rem] flex list-none flex-wrap justify-center gap-1 p-0"
      aria-label={t("a11y.jokerStickers")}
      data-testid={`joker-stickers-${joker.id}`}
    >
      {stickers.map((sticker, idx) => (
        <li
          key={`${sticker.kind}-${idx}`}
          className={cx(
            BADGE_BASE,
            isDebuffed(sticker)
              ? DEBUFFED_VARIANT
              : STICKER_BADGE_VARIANT[sticker.kind],
          )}
          aria-label={badgeAriaLabel(t, sticker)}
          data-testid={`joker-sticker-${sticker.kind}`}
        >
          {badgeText(sticker)}
        </li>
      ))}
    </ul>
  );
}

function badgeText(sticker: JokerSticker): string {
  if (sticker.kind === "perishable") {
    const remaining = Math.max(0, PERISHABLE_LIFE - sticker.roundsHeld);
    return `${STICKER_LETTER.perishable} ${remaining}/${PERISHABLE_LIFE}`;
  }
  return STICKER_LETTER[sticker.kind];
}

function badgeAriaLabel(t: TFunction, sticker: JokerSticker): string {
  const info = JOKER_STICKER_INFO[sticker.kind];
  if (sticker.kind === "perishable") {
    if (sticker.roundsHeld >= PERISHABLE_LIFE) {
      return t("a11y.stickerDebuffed", { name: info.name });
    }
    const remaining = PERISHABLE_LIFE - sticker.roundsHeld;
    return t("a11y.stickerRoundsLeft", {
      name: info.name,
      remaining,
      total: PERISHABLE_LIFE,
    });
  }
  return t("a11y.stickerInfo", { name: info.name, detail: info.description });
}
