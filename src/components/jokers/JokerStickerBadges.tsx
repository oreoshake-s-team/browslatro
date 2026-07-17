import "./JokerStickerBadges.css";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import {
  JOKER_STICKER_INFO,
  PERISHABLE_LIFE,
  jokerStickers,
  type Joker,
  type JokerSticker,
} from "../../items/jokers";

interface JokerStickerBadgesProps {
  readonly joker: Joker;
}

const STICKER_LETTER: Readonly<Record<JokerSticker["kind"], string>> = {
  eternal: "E",
  perishable: "P",
  rental: "R",
};

export default function JokerStickerBadges({ joker }: JokerStickerBadgesProps) {
  const { t } = useTranslation();
  const stickers = jokerStickers(joker);
  if (stickers.length === 0) return null;
  return (
    <ul
      className="joker-sticker-badges"
      aria-label={t("a11y.jokerStickers")}
      data-testid={`joker-stickers-${joker.id}`}
    >
      {stickers.map((sticker, idx) => (
        <li
          key={`${sticker.kind}-${idx}`}
          className={`joker-sticker-badge joker-sticker-badge-${sticker.kind}${
            sticker.kind === "perishable" && sticker.roundsHeld >= PERISHABLE_LIFE
              ? " joker-sticker-badge-debuffed"
              : ""
          }`}
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
