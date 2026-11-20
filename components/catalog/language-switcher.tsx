"use client";

import {useLocale, useTranslations} from "next-intl";
import {usePathname} from "@/i18n/navigation";
import {locales, localizedPath, type Locale} from "@/i18n/routing";

export function LanguageSwitcher() {
  const locale = useLocale();
  const path = usePathname();
  const t = useTranslations();
  return <select value={locale} aria-label={t("ui.language")} className="catalog-input h-8 max-w-full px-1.5 text-xs"
    onChange={({target}) => {
      const chosen = target.value as Locale;
      document.cookie = `NEXT_LOCALE=${chosen}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
      location.assign(localizedPath(path, chosen) + location.search + location.hash);
    }}>
    {locales.map((code) => <option key={code} value={code}>{t(`language.${code}`)}</option>)}
  </select>;
}
