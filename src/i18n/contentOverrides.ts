export interface ContentOverride {
  readonly name?: string;
  readonly description?: string;
}

export type ContentOverrideMap = Readonly<Record<string, ContentOverride>>;

export const HAW_PLANET_OVERRIDES: ContentOverrideMap = {
  mercury: { name: "ʻUkali" },
  venus: { name: "Hōkūloa" },
  mars: { name: "Hōkūʻula" },
  jupiter: { name: "Kaʻāwela" },
  saturn: { name: "Makulu" },
  earth: { name: "Honua" },
};

export const HAW_TAROT_OVERRIDES: ContentOverrideMap = {};

export const HAW_SPECTRAL_OVERRIDES: ContentOverrideMap = {};

const HAW_CONSUMABLE_OVERRIDES: ContentOverrideMap = {
  ...HAW_PLANET_OVERRIDES,
  ...HAW_TAROT_OVERRIDES,
  ...HAW_SPECTRAL_OVERRIDES,
};

const OVERRIDES_BY_LOCALE: Readonly<Record<string, ContentOverrideMap>> = {
  haw: HAW_CONSUMABLE_OVERRIDES,
};

export function localizedConsumableName(
  locale: string,
  id: string,
  fallback: string,
): string {
  return OVERRIDES_BY_LOCALE[locale]?.[id]?.name ?? fallback;
}

export function localizedConsumableDescription(
  locale: string,
  id: string,
  fallback: string,
): string {
  return OVERRIDES_BY_LOCALE[locale]?.[id]?.description ?? fallback;
}
