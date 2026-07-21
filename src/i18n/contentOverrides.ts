import { en } from "./locales/en";
import { localizedPlanetDescription, localizedPlanetName } from "./planetOverrides";
import { localizedSpectralDescription, localizedSpectralName } from "./spectralOverrides";

export interface ContentOverride {
  readonly name?: string;
  readonly description?: string;
}

export type ContentOverrideMap = Readonly<Record<string, ContentOverride>>;

export const HAW_TAROT_OVERRIDES: ContentOverrideMap = {};

const HAW_CONSUMABLE_OVERRIDES: ContentOverrideMap = {
  ...HAW_TAROT_OVERRIDES,
};

const OVERRIDES_BY_LOCALE: Readonly<Record<string, ContentOverrideMap>> = {
  haw: HAW_CONSUMABLE_OVERRIDES,
};

function isPlanetId(id: string): boolean {
  return id in en.planetNames;
}

function isSpectralId(id: string): boolean {
  return id in en.spectralNames;
}

export function localizedConsumableName(
  locale: string,
  id: string,
  fallback: string,
): string {
  if (isPlanetId(id)) return localizedPlanetName(locale, id, fallback);
  if (isSpectralId(id)) return localizedSpectralName(locale, id, fallback);
  return OVERRIDES_BY_LOCALE[locale]?.[id]?.name ?? fallback;
}

export function localizedConsumableDescription(
  locale: string,
  id: string,
  fallback: string,
): string {
  if (isPlanetId(id)) return localizedPlanetDescription(locale, id, fallback);
  if (isSpectralId(id)) return localizedSpectralDescription(locale, id, fallback);
  return OVERRIDES_BY_LOCALE[locale]?.[id]?.description ?? fallback;
}
