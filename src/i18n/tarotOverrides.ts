import { localizedContentString } from "./localeContent";

export function localizedTarotName(locale: string, id: string, fallback: string): string {
  return localizedContentString(locale, "tarotNames", id, fallback);
}

export function localizedTarotDescription(locale: string, id: string, fallback: string): string {
  return localizedContentString(locale, "tarotDescriptions", id, fallback);
}
