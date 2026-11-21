import type {CatalogListing} from "./product";
import {activityCode} from "@/i18n/ui-copy";
import {seriesGroups} from "./series";

export const catalogPageSize = 24;

export function catalogFacets(products: CatalogListing[]) {
  const families = new Map<string, number>();
  for (const {family} of products) if (family) families.set(family, (families.get(family) ?? 0) + 1);
  return {
    brands: [...new Map(products.map(({brandSlug, brand}) => [brandSlug, brand]))],
    series: seriesGroups(products),
    activities: [...new Map(products.flatMap(({activities}) => activities.map((value) => [activityCode(value), value] as const)))]
      .sort((a, b) => a[1].localeCompare(b[1])),
    productTypes: [...new Set(products.flatMap(({productType}) => productType ?? []))],
    protectionTypes: [...new Set(products.flatMap(({protectionType}) => protectionType ?? []))],
    families: [...families].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 8).map(([name]) => name),
  };
}
