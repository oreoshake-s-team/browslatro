import type { ReactNode } from "react";
import type { Suit } from "../../cards/types";
import type { HandLabel } from "../../scoring/handEvaluator";
import { localizedJokerDescription } from "../../i18n/jokerOverrides";
import { castleDescriptionNode } from "./castleDescription";
import { idolDescriptionText } from "./idolDescription";
import { toDoListDescriptionNode } from "./toDoListDescription";

export interface DynamicJokerDescriptionArgs {
  readonly language: string;
  readonly jokerId: string;
  readonly description: string;
  readonly todoHand: HandLabel | null;
  readonly castleSuit: Suit | null;
  readonly castleSuitName: string | null;
  readonly idolRankName: string | null;
  readonly idolSuitName: string | null;
}

export function dynamicJokerDescriptionNode(
  args: DynamicJokerDescriptionArgs,
): ReactNode {
  const base = localizedJokerDescription(
    args.language,
    args.jokerId,
    args.description,
  );
  if (args.jokerId === "to-do-list") {
    return toDoListDescriptionNode(base, args.todoHand);
  }
  if (args.jokerId === "castle") {
    return castleDescriptionNode(base, args.castleSuit, args.castleSuitName);
  }
  if (args.jokerId === "the-idol") {
    return idolDescriptionText(base, args.idolRankName, args.idolSuitName);
  }
  return base;
}
