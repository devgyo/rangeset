import type { MetadataRoute } from "next";
import { catalogEnabled, listProducts } from "@/lib/catalog";
import { siteUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries = [{ url: siteUrl.href }];
  if (!catalogEnabled) return entries;
  const products = await listProducts();
  return [
    ...entries,
    { url: new URL("/jackets", siteUrl).href },
    { url: new URL("/products", siteUrl).href },
    ...products.filter((product) => product.isHardshell).map(({ slug }) => ({
      url: new URL(`/jackets/${slug}`, siteUrl).href,
    })),
  ];
}
