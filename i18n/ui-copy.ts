import {useLocale, useTranslations} from "next-intl";
import type {Gender} from "@/lib/product-view";

export type Translator = ReturnType<typeof useTranslations>;
export const genderDisplay = (t: Translator, data: Gender | null) => data ? t("gender." + data) : t("status.missing");
const activityAliases: Record<string, string> = {hiking: "hike", freeriding: "freeride", ski_touring: "touring", trail_running: "trail_run"};
export function activityCode(value: string) {
  const code = value.toLowerCase().replace(/[^a-z0-9]+/g, "_");
  return activityAliases[code] ?? code;
}

export const activityLabel = (t: Translator, value: string) => {
  const key = "activity." + activityCode(value);
  return t.has(key) ? t(key) : value;
};

export function useCopy() {
  const t = useTranslations();
  const locale = useLocale();
  return {t, locale};
}
