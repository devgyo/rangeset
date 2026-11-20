import type {MammutProduct} from "../../crawler/adapters/mammut";
import {catalogSource, sourceIsVisible, toView, type CatalogSource, type PriceRow} from "./product";
import type {IndexedSpec} from "../brands/types";

export type FixtureRow = CatalogSource & {specs: IndexedSpec[]; prices: PriceRow[]};

export function mammutSource({raw, url, fetchedAt, slug}: MammutProduct): FixtureRow {
  const prices = raw.variants.map(({id, price, inStock}) => ({variant: id, price, currency: "USD", inStock}));
  const known = prices.filter(({inStock}) => inStock !== null);
  const inStock = known.some(({inStock}) => inStock) ? true : known.length > 0 && known.length === prices.length ? false : null;
  return {
    name: raw.name, category: raw.category, gender: raw.gender, url, slug, brand: "Mammut", brandSlug: "mammut",
    lastSeen: fetchedAt, payloadFetchedAt: fetchedAt, payload: raw,
    styleFamily: null, isHardshell: false, status: "active", subTags: raw.categories,
    stockRatio: known.length ? known.filter(({inStock}) => inStock).length / known.length : null,
    specs: [], prices: [{variant: "", price: raw.salePrice ?? raw.msrp, currency: "USD", inStock}, ...prices],
  };
}

export function fixtureProducts(rows: FixtureRow[], detail: boolean, slugs?: string[]) {
  return rows.flatMap((row) => {
    if (slugs && !slugs.includes(row.slug)) return [];
    const source = catalogSource(row);
    return sourceIsVisible(source) ? [toView(source, row.specs, row.prices, detail)] : [];
  });
}
