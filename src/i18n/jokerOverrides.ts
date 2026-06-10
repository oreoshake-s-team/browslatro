export interface JokerContentOverride {
  readonly name?: string;
  readonly description?: string;
}

export type JokerOverrideMap = Readonly<Record<string, JokerContentOverride>>;

export const HAW_JOKER_OVERRIDES: JokerOverrideMap = {};

const OVERRIDES_BY_LOCALE: Readonly<Record<string, JokerOverrideMap>> = {
  haw: HAW_JOKER_OVERRIDES,
};

export function localizedJokerName(
  locale: string,
  id: string,
  fallback: string,
): string {
  return OVERRIDES_BY_LOCALE[locale]?.[id]?.name ?? fallback;
}

export function localizedJokerDescription(
  locale: string,
  id: string,
  fallback: string,
): string {
  return OVERRIDES_BY_LOCALE[locale]?.[id]?.description ?? fallback;
}
