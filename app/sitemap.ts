import type { MetadataRoute } from "next";
import { catalogEnabled, indexableProductSlugs } from "@/lib/catalog";
import { siteUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries = [{ url: siteUrl.href }];
  if (!catalogEnabled) return entries;
  const slugs = await indexableProductSlugs();
  return [
    ...entries,
    { url: new URL("/jackets", siteUrl).href },
    { url: new URL("/products", siteUrl).href },
    ...slugs.map((slug) => ({ url: new URL(`/products/${slug}`, siteUrl).href })),
  ];
}
