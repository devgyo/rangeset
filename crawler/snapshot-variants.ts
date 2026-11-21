import {arcSnapshotVariants, parseArcteryx} from "./adapters/arcteryx";
import {parseMammut} from "./adapters/mammut";
import type {Page} from "./http";
import {priceCents, snapshotVariantKey} from "./snapshot-observation";

export type SnapshotBrand = "arcteryx" | "mammut";

function arcteryxObservations({body, finalUrl, fetchedAt}: Page) {
  const {externalId, raw} = parseArcteryx(body, finalUrl, fetchedAt);
  return {externalId, variants: arcSnapshotVariants(raw)};
}

function mammutObservations({body, finalUrl, fetchedAt}: Page) {
  const {externalId, raw} = parseMammut(body, finalUrl, fetchedAt);
  const variants = raw.variants.map(({id, sku, color, size, price, originalPrice, currency, inStock}) => ({
    variantKey: snapshotVariantKey(sku === undefined ? id : sku, color, size), color, size,
    priceCents: priceCents(originalPrice ?? price),
    salePriceCents: price !== null && originalPrice !== null && price < originalPrice ? priceCents(price) : null,
    currency, inStock,
  }));
  return {externalId, variants};
}

export function snapshotVariants(brand: SnapshotBrand, expectedSku: string, page: Page) {
  const {externalId, variants} = brand === "arcteryx" ? arcteryxObservations(page) : mammutObservations(page);
  if (externalId !== expectedSku) throw new Error("Brand page returned a different SKU");
  if (!variants.length) throw new Error("No published size–color variants");
  const unique = new Map<string, typeof variants[number]>();
  for (const row of variants) {
    const prior = unique.get(row.variantKey);
    if (prior && JSON.stringify(prior) !== JSON.stringify(row)) throw new Error("Conflicting observations for a size–color variant");
    unique.set(row.variantKey, row);
  }
  return [...unique.values()];
}
