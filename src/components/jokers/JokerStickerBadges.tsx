import "./JokerStickerBadges.css";
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
  const stickers = jokerStickers(joker);
  if (stickers.length === 0) return null;
  return (
    <ul
      className="joker-sticker-badges"
      aria-label="Joker stickers"
      data-testid={`joker-stickers-${joker.id}`}
    >
      {stickers.map((sticker, idx) => (
        <li
          key={`${sticker.kind}-${idx}`}
          className={`joker-sticker-badge joker-sticker-badge-${sticker.kind}`}
          aria-label={badgeAriaLabel(sticker)}
          data-testid={`joker-sticker-${sticker.kind}`}
        >
          {STICKER_LETTER[sticker.kind]}
        </li>
      ))}
    </ul>
  );
}

function badgeAriaLabel(sticker: JokerSticker): string {
  const info = JOKER_STICKER_INFO[sticker.kind];
  if (sticker.kind === "perishable") {
    const remaining = Math.max(0, PERISHABLE_LIFE - sticker.roundsHeld);
    return `${info.name} — ${remaining} of ${PERISHABLE_LIFE} rounds left`;
  }
  return `${info.name} — ${info.description}`;
}
