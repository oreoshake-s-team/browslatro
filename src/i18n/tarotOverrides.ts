import { en } from "./locales/en";
import { haw } from "./locales/haw";

type TarotStrings = Readonly<Record<string, string>>;

const NAMES_BY_LOCALE: Readonly<Record<string, TarotStrings>> = {
  en: en.tarotNames,
  haw: haw.tarotNames,
};

const DESCRIPTIONS_BY_LOCALE: Readonly<Record<string, TarotStrings>> = {
  en: en.tarotDescriptions,
  haw: haw.tarotDescriptions,
};

export function localizedTarotName(locale: string, id: string, fallback: string): string {
  return NAMES_BY_LOCALE[locale]?.[id] ?? NAMES_BY_LOCALE.en[id] ?? fallback;
}

export function localizedTarotDescription(locale: string, id: string, fallback: string): string {
  return DESCRIPTIONS_BY_LOCALE[locale]?.[id] ?? DESCRIPTIONS_BY_LOCALE.en[id] ?? fallback;
}
