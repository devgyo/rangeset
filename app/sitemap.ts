import type {MetadataRoute} from "next";
import {catalogEnabled, indexableProductSlugs} from "@/lib/catalog";
import {languageAlternates, localizedPath, locales} from "@/i18n/routing";
import {taxonomyPath, taxonomySlugs} from "@/lib/taxonomy";
import {siteUrl} from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const paths = ["/"];
  if (catalogEnabled) {
    const slugs = await indexableProductSlugs();
    paths.push("/products", ...taxonomySlugs.map(taxonomyPath), ...slugs.map((slug) => `/products/${slug}`));
  }
  return paths.flatMap((path) => {
    const languages = Object.fromEntries(Object.entries(languageAlternates(path)).map(([locale, href]) => [locale, new URL(href, siteUrl).href]));
    return locales.map((locale) => ({
      url: new URL(localizedPath(path, locale), siteUrl).href,
      alternates: {languages},
    }));
  });
}
