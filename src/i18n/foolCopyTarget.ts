import type { TFunction } from "i18next";
import type { Consumable } from "../items/consumables";
import { localizedConsumableName } from "./contentOverrides";

export const FOOL_ID = "the-fool";

export function foolCopyTargetText(
  t: TFunction,
  locale: string,
  lastUsed: Consumable | null,
): string {
  if (lastUsed === null) return t("consumables.foolCopyNone");
  return t("consumables.foolWillCreate", {
    name: localizedConsumableName(locale, lastUsed.card.id, lastUsed.card.name),
    kind: lastUsed.kind === "planet" ? t("shop.kindPlanet") : t("shop.kindTarot"),
  });
}

export function appendFoolHint(
  description: string,
  consumableId: string,
  foolCopyTarget: string | undefined,
): string {
  if (consumableId !== FOOL_ID || foolCopyTarget === undefined) return description;
  return `${description} — ${foolCopyTarget}`;
}
