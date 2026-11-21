import {activityCode} from "@/i18n/ui-copy";
import type {CatalogListing} from "@/lib/catalog";
import {defaultCatalogSort, rankFeatured, type CatalogSort} from "@/lib/catalog/featured-sort";
import {searchCatalog} from "@/lib/catalog-search";
import {matchesTaxonomy} from "@/lib/taxonomy";

export function filterCatalog(catalog: CatalogListing[], {
  category, gender, family, brand, series, legacyLine, activity, productType, protectionType, query, sort,
}: {
  category: string; gender: string; family: string; brand: string[]; series: string[]; legacyLine: string | null;
  activity: string[]; productType: string; protectionType: string; query: string; sort: CatalogSort;
}) {
  const products = catalog.filter((product) => !category || matchesTaxonomy(product, category));
  const filtered = products.filter((product) =>
    (!gender || product.gender === gender) && (!family || product.family === family) &&
    (!brand.length || brand.includes(product.brandSlug)) &&
    (!series.length ? !legacyLine || product.veilance === (legacyLine === "veilance") : series.some((value) => product.series?.includes(value))) &&
    (!activity.length || activity.some((value) => product.activities.some((label) => activityCode(label) === value))) && (!productType || product.productType === productType) &&
    (!protectionType || product.protectionType === protectionType));
  const matches = searchCatalog(filtered, query);
  return sort === defaultCatalogSort ? rankFeatured(matches).map(({product}) => product)
    : [...matches].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      const first = sort === "weight" ? a.card.weight : a.msrp;
      const second = sort === "weight" ? b.card.weight : b.msrp;
      if (typeof first !== "number") return typeof second === "number" ? 1 : 0;
      if (typeof second !== "number") return -1;
      if (sort !== "weight" && a.currency !== b.currency) {
        return (a.currency ?? "").localeCompare(b.currency ?? "");
      }
      return (first - second) * (sort === "price-desc" ? -1 : 1) || a.name.localeCompare(b.name);
    });
}
