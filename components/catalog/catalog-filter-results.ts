import {activityCode} from "@/i18n/ui-copy";
import type {CatalogListing} from "@/lib/catalog";
import {compareCatalogIdentity, defaultCatalogSort, rankFeatured, type CatalogSort} from "@/lib/catalog/featured-sort";
import {searchCatalog} from "@/lib/catalog-search";
import {seriesGroups, seriesMatches} from "@/lib/catalog/series";
import {matchesTaxonomy} from "@/lib/taxonomy";

export function filterCatalog(catalog: CatalogListing[], {
  category, gender, family, brand, series, legacyLine, activity, productType, protectionType, query, sort, translate,
}: {
  category: string; gender: string; family: string; brand: string[]; series: string[]; legacyLine: string | null;
  activity: string[]; productType: string; protectionType: string; query: string; sort: CatalogSort; translate?: (key: string) => string;
}) {
  const products = catalog.filter((product) => !category || matchesTaxonomy(product, category));
  const filtered = products.filter((product) =>
    (!gender || product.gender === gender) && (!family || product.family === family) &&
    (!brand.length || brand.includes(product.brandSlug)) &&
    (!activity.length || activity.some((value) => product.activities.some((label) => activityCode(label) === value))) && (!productType || product.productType === productType) &&
    (!protectionType || product.protectionType === protectionType));
  const selected = series.length || legacyLine ? filtered.filter((product) =>
    series.length ? series.some((value) => product.series?.some((line) => seriesMatches(value, product.brandSlug, line))) :
      product.veilance === (legacyLine === "veilance")) : filtered;
  const matches = searchCatalog(selected, query, translate);
  const counts = seriesGroups(selected === filtered ? matches : searchCatalog(filtered, query, translate));
  const results = sort === defaultCatalogSort ? rankFeatured(matches).map(({product}) => product)
    : [...matches].sort((a, b) => {
      const byName = a.name.localeCompare(b.name, "en") || compareCatalogIdentity(a, b);
      if (sort === "name") return byName;
      const first = sort === "weight" ? a.card.weight : a.msrp;
      const second = sort === "weight" ? b.card.weight : b.msrp;
      if (typeof first !== "number") return typeof second === "number" ? 1 : byName;
      if (typeof second !== "number") return -1;
      if (sort !== "weight" && a.currency !== b.currency) {
        return (a.currency ?? "").localeCompare(b.currency ?? "", "en") || byName;
      }
      return (first - second) * (sort === "price-desc" ? -1 : 1) || byName;
    });
  return {results, counts};
}
