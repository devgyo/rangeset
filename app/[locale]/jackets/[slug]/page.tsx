import {permanentRedirect} from "next/navigation";
import {currentLocale} from "@/i18n/seo";
import {localizedPath} from "@/i18n/routing";

export default async function JacketPage({params}: PageProps<"/[locale]/jackets/[slug]">) {
  const [{slug}, locale] = await Promise.all([params, currentLocale()]);
  permanentRedirect(localizedPath(`/products/${encodeURIComponent(slug)}`, locale));
}
