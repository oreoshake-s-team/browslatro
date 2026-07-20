import { en } from "./locales/en";
import { haw } from "./locales/haw";

type VoucherStrings = Readonly<Record<string, string>>;

const NAMES_BY_LOCALE: Readonly<Record<string, VoucherStrings>> = {
  en: en.voucherNames,
  haw: haw.voucherNames,
};

const DESCRIPTIONS_BY_LOCALE: Readonly<Record<string, VoucherStrings>> = {
  en: en.voucherDescriptions,
  haw: haw.voucherDescriptions,
};

export function localizedVoucherName(locale: string, id: string, fallback: string): string {
  return NAMES_BY_LOCALE[locale]?.[id] ?? NAMES_BY_LOCALE.en[id] ?? fallback;
}

export function localizedVoucherDescription(locale: string, id: string, fallback: string): string {
  return DESCRIPTIONS_BY_LOCALE[locale]?.[id] ?? DESCRIPTIONS_BY_LOCALE.en[id] ?? fallback;
}
