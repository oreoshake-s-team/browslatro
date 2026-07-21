import { en } from "./locales/en";
import { localizedPlanetDescription, localizedPlanetName } from "./planetOverrides";
import { localizedTarotDescription, localizedTarotName } from "./tarotOverrides";

export interface ContentOverride {
  readonly name?: string;
  readonly description?: string;
}

export type ContentOverrideMap = Readonly<Record<string, ContentOverride>>;

export const HAW_SPECTRAL_OVERRIDES: ContentOverrideMap = {};

const HAW_CONSUMABLE_OVERRIDES: ContentOverrideMap = {
  ...HAW_SPECTRAL_OVERRIDES,
};

const OVERRIDES_BY_LOCALE: Readonly<Record<string, ContentOverrideMap>> = {
  haw: HAW_CONSUMABLE_OVERRIDES,
};

function isPlanetId(id: string): boolean {
  return id in en.planetNames;
}

function isTarotId(id: string): boolean {
  return id in en.tarotNames;
}

export function localizedConsumableName(
  locale: string,
  id: string,
  fallback: string,
): string {
  if (isPlanetId(id)) return localizedPlanetName(locale, id, fallback);
  if (isTarotId(id)) return localizedTarotName(locale, id, fallback);
  return OVERRIDES_BY_LOCALE[locale]?.[id]?.name ?? fallback;
}

export function localizedConsumableDescription(
  locale: string,
  id: string,
  fallback: string,
): string {
  if (isPlanetId(id)) return localizedPlanetDescription(locale, id, fallback);
  if (isTarotId(id)) return localizedTarotDescription(locale, id, fallback);
  return OVERRIDES_BY_LOCALE[locale]?.[id]?.description ?? fallback;
}
