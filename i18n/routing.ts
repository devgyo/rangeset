import {defineRouting} from "next-intl/routing";

export const locales = ["en", "zh", "ja"] as const;
export type Locale = (typeof locales)[number];
export const languageTags = {en: "en", zh: "zh-Hans", ja: "ja"} as const;

export const routing = defineRouting({
  locales,
  defaultLocale: "en",
  localePrefix: "as-needed",
  localeDetection: false,
  localeCookie: false,
  alternateLinks: false,
});

export function localizedPath(path: string, locale: Locale) {
  return locale === "en" ? path : `/${locale}${path === "/" ? "" : path}`;
}

export function languageAlternates(path: string) {
  return {
    en: localizedPath(path, "en"),
    "zh-Hans": localizedPath(path, "zh"),
    ja: localizedPath(path, "ja"),
    "x-default": localizedPath(path, "en"),
  };
}

export function pageAlternates(path: string, locale: Locale) {
  return {canonical: localizedPath(path, locale), languages: languageAlternates(path)};
}
