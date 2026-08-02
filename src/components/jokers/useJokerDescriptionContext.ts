import { useTranslation } from "react-i18next";
import { tSuitName } from "../../i18n/strings";
import type { DynamicJokerDescriptionArgs } from "../../items/jokers/dynamicJokerDescription";
import { useGame } from "../../store/game";

type JokerDescriptionContext = Omit<
  DynamicJokerDescriptionArgs,
  "language" | "jokerId" | "description"
>;

export function useJokerDescriptionContext(): JokerDescriptionContext {
  const { t } = useTranslation();
  const todoHand = useGame((s) => s.todoHand);
  const castleSuit = useGame((s) => s.castleSuit);
  const castleSuitName = castleSuit ? tSuitName(t, castleSuit) : null;
  const idolTarget = useGame((s) => s.idolTarget);
  const idolRankName = idolTarget?.rank ?? null;
  const idolSuitName = idolTarget ? tSuitName(t, idolTarget.suit) : null;
  return { todoHand, castleSuit, castleSuitName, idolRankName, idolSuitName };
}
