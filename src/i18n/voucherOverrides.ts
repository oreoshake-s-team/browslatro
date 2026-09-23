import { localizedContentString } from "./localeContent";

export function localizedVoucherName(locale: string, id: string, fallback: string): string {
  return localizedContentString(locale, "voucherNames", id, fallback);
}

export function localizedVoucherDescription(locale: string, id: string, fallback: string): string {
  return localizedContentString(locale, "voucherDescriptions", id, fallback);
}
