import { useTranslation } from "react-i18next";
import type { CardEdition, Enhancement, Seal } from "../../cards/types";
import type { JokerEdition } from "../../items/jokers";
import "./CardModifierBadges.css";

export const ENHANCEMENT_LABEL_KEY = {
  bonus: "cardLabels.enhancementBonus",
  mult: "cardLabels.enhancementMult",
  wild: "cardLabels.enhancementWild",
  glass: "cardLabels.enhancementGlass",
  steel: "cardLabels.enhancementSteel",
  stone: "cardLabels.enhancementStone",
  gold: "cardLabels.enhancementGold",
  lucky: "cardLabels.enhancementLucky",
} as const satisfies Record<Enhancement, string>;

export const CARD_EDITION_LABEL_KEY = {
  foil: "cardLabels.editionFoil",
  holographic: "cardLabels.editionHolographic",
  polychrome: "cardLabels.editionPolychrome",
} as const satisfies Record<CardEdition, string>;

export const SEAL_LABEL_KEY = {
  gold: "cardLabels.sealGold",
  red: "cardLabels.sealRed",
  blue: "cardLabels.sealBlue",
  purple: "cardLabels.sealPurple",
} as const satisfies Record<Seal, string>;

export const JOKER_EDITION_LABEL_KEY = {
  foil: "cardLabels.editionFoil",
  holographic: "cardLabels.editionHolographic",
  polychrome: "cardLabels.editionPolychrome",
  negative: "cardLabels.editionNegative",
} as const satisfies Record<JokerEdition, string>;

export interface CardModifierBadgesProps {
  readonly scope: string;
  readonly suffix: string | number;
  readonly enhancement?: Enhancement | null;
  readonly cardEdition?: CardEdition | null;
  readonly seal?: Seal | null;
  readonly jokerEdition?: JokerEdition | null;
}

export default function CardModifierBadges({
  scope,
  suffix,
  enhancement,
  cardEdition,
  seal,
  jokerEdition,
}: CardModifierBadgesProps): React.JSX.Element | null {
  const { t } = useTranslation();
  if (!enhancement && !cardEdition && !seal && !jokerEdition) return null;
  return (
    <>
      {jokerEdition && (
        <span
          className={`card-mod-badge card-mod-joker-edition card-mod-joker-edition-${jokerEdition}`}
          data-testid={`${scope}-edition-${suffix}`}
        >
          {t(JOKER_EDITION_LABEL_KEY[jokerEdition])}
        </span>
      )}
      {enhancement && (
        <span
          className={`card-mod-badge card-mod-enhancement-${enhancement}`}
          data-testid={`${scope}-card-enhancement-${suffix}`}
        >
          {t(ENHANCEMENT_LABEL_KEY[enhancement])}
        </span>
      )}
      {cardEdition && (
        <span
          className={`card-mod-badge card-mod-edition-${cardEdition}`}
          data-testid={`${scope}-card-edition-${suffix}`}
        >
          {t(CARD_EDITION_LABEL_KEY[cardEdition])}
        </span>
      )}
      {seal && (
        <span
          className={`card-mod-badge card-mod-seal-${seal}`}
          data-testid={`${scope}-card-seal-${suffix}`}
        >
          {t(SEAL_LABEL_KEY[seal])}
        </span>
      )}
    </>
  );
}
