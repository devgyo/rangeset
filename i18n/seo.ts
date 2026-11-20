import {getLocale} from "next-intl/server";
import type {Locale} from "./routing";

export async function currentLocale() {
  return await getLocale() as Locale;
}
