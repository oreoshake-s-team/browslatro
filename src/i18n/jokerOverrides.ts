import { localizedContentString } from "./localeContent";
import { JOKER_PLACEHOLDER_VALUES } from "./jokerPlaceholders";

function interpolate(template: string, id: string): string {
  const values = JOKER_PLACEHOLDER_VALUES[id];
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => values?.[key] ?? match);
}

export function localizedJokerName(locale: string, id: string, fallback: string): string {
  return localizedContentString(locale, "jokerNames", id, fallback);
}

export function localizedJokerDescription(locale: string, id: string, fallback: string): string {
  const template = localizedContentString(locale, "jokerDescriptions", id, "");
  return template !== "" ? interpolate(template, id) : fallback;
}
