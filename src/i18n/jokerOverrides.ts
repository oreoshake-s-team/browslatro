import { en } from "./locales/en";
import { haw } from "./locales/haw";
import { JOKER_PLACEHOLDER_VALUES } from "./jokerPlaceholders";

type JokerStrings = Readonly<Record<string, string>>;

const NAMES_BY_LOCALE: Readonly<Record<string, JokerStrings>> = {
  en: en.jokerNames,
  haw: haw.jokerNames,
};

const DESCRIPTIONS_BY_LOCALE: Readonly<Record<string, JokerStrings>> = {
  en: en.jokerDescriptions,
  haw: haw.jokerDescriptions,
};

function interpolate(template: string, id: string): string {
  const values = JOKER_PLACEHOLDER_VALUES[id];
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => values?.[key] ?? match);
}

export function localizedJokerName(locale: string, id: string, fallback: string): string {
  return NAMES_BY_LOCALE[locale]?.[id] ?? NAMES_BY_LOCALE.en[id] ?? fallback;
}

export function localizedJokerDescription(locale: string, id: string, fallback: string): string {
  const template = DESCRIPTIONS_BY_LOCALE[locale]?.[id] ?? DESCRIPTIONS_BY_LOCALE.en[id];
  return template !== undefined ? interpolate(template, id) : fallback;
}
