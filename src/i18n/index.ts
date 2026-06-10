import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { en } from "./locales/en";
import { haw } from "./locales/haw";

export const SUPPORTED_LOCALES = ["en", "haw"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const LOCALE_NAMES: Readonly<Record<Locale, string>> = {
  en: "English",
  haw: "ʻŌlelo Hawaiʻi",
};

const STORAGE_KEY = "browslatro:locale";

export function isLocale(value: string | null): value is Locale {
  return value !== null && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function detectLocale(): Locale {
  if (typeof window === "undefined") return "en";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (isLocale(stored)) return stored;
  const nav = window.navigator.language?.toLowerCase() ?? "";
  return nav === "haw" || nav.startsWith("haw-") ? "haw" : "en";
}

export function persistLocale(locale: Locale): void {
  window.localStorage.setItem(STORAGE_KEY, locale);
}

i18n.on("languageChanged", (lng) => {
  if (typeof document !== "undefined") {
    document.documentElement.lang = lng;
  }
});

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    haw: { translation: haw },
  },
  lng: detectLocale(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
  returnNull: false,
  initAsync: false,
});

export default i18n;
