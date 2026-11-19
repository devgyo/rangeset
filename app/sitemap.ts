import type { MetadataRoute } from "next";
import { jackets } from "@/lib/jackets";
import { siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteUrl.href },
    { url: new URL("/jackets", siteUrl).href },
    ...jackets.filter((jacket) => !jacket.example).map((jacket) => ({
      url: new URL(`/jackets/${jacket.slug}`, siteUrl).href,
    })),
  ];
}
