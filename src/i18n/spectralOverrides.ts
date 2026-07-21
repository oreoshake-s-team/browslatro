import { en } from "./locales/en";
import { haw } from "./locales/haw";

type SpectralStrings = Readonly<Record<string, string>>;

const NAMES_BY_LOCALE: Readonly<Record<string, SpectralStrings>> = {
  en: en.spectralNames,
  haw: haw.spectralNames,
};

const DESCRIPTIONS_BY_LOCALE: Readonly<Record<string, SpectralStrings>> = {
  en: en.spectralDescriptions,
  haw: haw.spectralDescriptions,
};

export function localizedSpectralName(locale: string, id: string, fallback: string): string {
  return NAMES_BY_LOCALE[locale]?.[id] ?? NAMES_BY_LOCALE.en[id] ?? fallback;
}

export function localizedSpectralDescription(locale: string, id: string, fallback: string): string {
  return DESCRIPTIONS_BY_LOCALE[locale]?.[id] ?? DESCRIPTIONS_BY_LOCALE.en[id] ?? fallback;
}
