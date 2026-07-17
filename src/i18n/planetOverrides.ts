import { en } from "./locales/en";
import { haw } from "./locales/haw";

type PlanetStrings = Readonly<Record<string, string>>;

const NAMES_BY_LOCALE: Readonly<Record<string, PlanetStrings>> = {
  en: en.planetNames,
  haw: haw.planetNames,
};

const DESCRIPTIONS_BY_LOCALE: Readonly<Record<string, PlanetStrings>> = {
  en: en.planetDescriptions,
  haw: haw.planetDescriptions,
};

export function localizedPlanetName(locale: string, id: string, fallback: string): string {
  return NAMES_BY_LOCALE[locale]?.[id] ?? NAMES_BY_LOCALE.en[id] ?? fallback;
}

export function localizedPlanetDescription(locale: string, id: string, fallback: string): string {
  return DESCRIPTIONS_BY_LOCALE[locale]?.[id] ?? DESCRIPTIONS_BY_LOCALE.en[id] ?? fallback;
}
