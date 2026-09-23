import { localizedContentString } from "./localeContent";

export function localizedSpectralName(locale: string, id: string, fallback: string): string {
  return localizedContentString(locale, "spectralNames", id, fallback);
}

export function localizedSpectralDescription(locale: string, id: string, fallback: string): string {
  return localizedContentString(locale, "spectralDescriptions", id, fallback);
}
