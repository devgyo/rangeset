import {hasLocale} from "next-intl";
import {getRequestConfig} from "next-intl/server";
import en from "../messages/en.json";
import zh from "../messages/zh.json";
import ja from "../messages/ja.json";
import {routing} from "./routing";

const messages = {en, zh, ja};
const logged = new Set<string>();

export default getRequestConfig(async ({requestLocale}) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  const help = messages[locale].help;
  if (process.env.NODE_ENV === "development" && locale !== "en" && !logged.has(locale)) {
    logged.add(locale);
    const missing = Object.keys(en.help).filter((key) => !Object.hasOwn(help, key));
    if (missing.length) console.warn(`[i18n ${locale}] English help fallback: ${missing.map((key) => "help." + key).join(", ")}`);
  }
  return {locale, messages: {...messages[locale], help: {...en.help, ...help}}};
});
