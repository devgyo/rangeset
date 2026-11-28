import type {MammutProduct} from "../../crawler/adapters/mammut";
import {catalogSource, sourceIsVisible, toView, type CatalogSource, type PriceRow} from "./product";
import type {IndexedSpec} from "../brands/types";

export type FixtureRow = CatalogSource & {specs: IndexedSpec[]; prices: PriceRow[]};

export function mammutSource({raw, url, fetchedAt, slug}: MammutProduct): FixtureRow {
  const prices = raw.variants.map(({id, price}) => ({variant: id, price, currency: "USD"}));
  return {
    name: raw.name, category: raw.category, gender: raw.gender, url, slug, brand: "Mammut", brandSlug: "mammut",
    lastSeen: fetchedAt, payloadFetchedAt: fetchedAt, payload: raw,
    styleFamily: null, isHardshell: false, status: "active", subTags: raw.categories,
    specs: [], prices: [{variant: "", price: raw.salePrice ?? raw.msrp, currency: "USD"}, ...prices],
  };
}

export function fixtureProducts(rows: FixtureRow[], detail: boolean, slugs?: string[]) {
  return rows.flatMap((row) => {
    if (slugs && !slugs.includes(row.slug)) return [];
    const source = catalogSource(row);
    return sourceIsVisible(source) ? [toView(source, row.specs, row.prices, detail)] : [];
  });
}
