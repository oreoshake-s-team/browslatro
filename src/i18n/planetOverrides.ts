import { localizedContentString } from "./localeContent";

export function localizedPlanetName(locale: string, id: string, fallback: string): string {
  return localizedContentString(locale, "planetNames", id, fallback);
}

export function localizedPlanetDescription(locale: string, id: string, fallback: string): string {
  return localizedContentString(locale, "planetDescriptions", id, fallback);
}
