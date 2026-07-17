import { Badge } from "../ui/Badge";
import { useTranslation } from "react-i18next";
import { JOKER_EDITION_INFO } from "../../items/jokers";
import type { JokerEdition } from "../../items/jokers";

interface JokerEditionBadgeProps {
  readonly edition: JokerEdition;
}

const EDITION_BADGE_KEY = {
  foil: "cardLabels.editionBadgeFoil",
  holographic: "cardLabels.editionBadgeHolographic",
  polychrome: "cardLabels.editionBadgePolychrome",
  negative: "cardLabels.editionBadgeNegative",
} as const satisfies Record<JokerEdition, string>;

const EDITION_TONE = {
  foil: "chips",
  holographic: "advisor",
  polychrome: "success",
  negative: "muted",
} as const satisfies Record<
  JokerEdition,
  "chips" | "advisor" | "success" | "muted"
>;

export default function JokerEditionBadge({ edition }: JokerEditionBadgeProps) {
  const { t } = useTranslation();
  const info = JOKER_EDITION_INFO[edition];
  return (
    <Badge
      tone={EDITION_TONE[edition]}
      aria-label={t("a11y.jokerEdition", {
        name: info.name,
        description: info.description,
      })}
      data-testid={`joker-edition-badge-${edition}`}
    >
      {t(EDITION_BADGE_KEY[edition])}
    </Badge>
  );
}
