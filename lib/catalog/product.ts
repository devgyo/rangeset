import {brandAdapter, parametersOf} from "../brands";
import type {IndexedSpec} from "../brands/types";
import {plainText, productGender, record, type CatalogCard, type CatalogSpec, type ProductDetail} from "../product-view";
import {classifyTaxonomy, leafSlug, type TaxonomyResult} from "../taxonomy";
import {known, missing} from "../parameters/model";
import {classificationFilterValue} from "../parameters/classification";
import {countCardValues, selectCardParameters, type CardParameters} from "../parameters/card";
import {releaseSeasonRank, type FeaturedProduct} from "./featured-sort";

export type CatalogSource = {
  id?: number;
  name: string; slug: string; brand: string; brandSlug: string; category: string | null; gender: string | null; url: string | null;
  status: ProductDetail["status"]; subTags: string[]; isHardshell: boolean; styleFamily: string | null;
  lastSeen: string; payloadFetchedAt: string | null; payload: unknown; taxonomyPayload?: unknown; overrideValues?: Record<string, unknown>;
};

export type PriceRow = {variant: string; price: number | null; currency: string | null};
export type CatalogView = ProductDetail & Pick<FeaturedProduct, "brandSlug" | "styleFamily" | "id">;
export type CatalogListing = Pick<CatalogCard, "brand" | "category" | "gender" | "family" | "subTags" | "veilance" | "example" |
  "image" | "swatches" | "activities" | "msrp" | "currency" | "taxonomy" | "modelNumbers" | "series" | "productType" | "protectionType">
  & FeaturedProduct & {card: CardParameters; swatchCount: number; membrane?: string | number | boolean};

export const defaultUnits: Record<string, string> = {
  weight_g: "g", layers: "layers", face_denier: "D", fabric_gsm: "g/m²", centre_back_length_cm: "cm", inseam: "cm",
  waterproof_mm: "mm",
};
export const isoDate = (value: string) => new Date(value).toISOString().slice(0, 10);

function scalar(value: unknown): value is CatalogSpec["value"] {
  return typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value)) ||
    (typeof value === "string" && Boolean(plainText(value)));
}

function amount(value: unknown) {
  const parsed = typeof value === "number" || (typeof value === "string" && /^\d+(?:\.\d+)?$/.test(value.trim())) ? Number(value) : null;
  return parsed != null && Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function sourceUrl(value: unknown) {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : undefined;
  } catch {
    return undefined;
  }
}

export function catalogSource<T extends CatalogSource>(row: T) {
  const overrides = new Map(Object.entries(row.overrideValues ?? {}));
  const name = overrides.get("name");
  const category = overrides.get("category");
  const gender = overrides.get("gender");
  const status = overrides.get("status");
  return {
    ...row, overrides,
    name: typeof name === "string" && name.trim() ? name : row.name,
    category: typeof category === "string" || category === null ? category : row.category,
    gender: typeof gender === "string" || gender === null ? gender : row.gender,
    status: status === "active" || status === "discontinued" || status === "pending_review" ? status : row.status,
    url: sourceUrl(overrides.get("url")) ?? row.url,
  };
}

export function sourceIsVisible(row: ReturnType<typeof catalogSource>) {
  return brandAdapter(row.brandSlug)?.accepts(row, {raw: record(row.payload), overrides: row.overrides}) === true;
}

export function toView(row: ReturnType<typeof catalogSource>, dbSpecs: IndexedSpec[], dbPrices: PriceRow[], detail: boolean): CatalogView {
  const adapter = brandAdapter(row.brandSlug);
  if (!adapter) throw new Error("Unsupported catalog brand: " + row.brandSlug);
  const payload = record(row.payload);
  const verifiedAt = isoDate(row.lastSeen);
  const fields = adapter.fields({...row, verifiedAt}, payload, detail);
  const {specs, publishedPrice, publishedCurrency: currencyCode, unisex, styleFamily, ...visuals} = fields;
  for (const spec of dbSpecs) {
    if (spec.source === "brand" && scalar(spec.value)) specs[spec.key] = {
      value: typeof spec.value === "string" ? plainText(spec.value) : spec.value,
      unit: spec.unit ?? defaultUnits[spec.key] ?? null, source: "brand", date: isoDate(spec.fetchedAt),
    };
  }
  for (const [field, value] of row.overrides) {
    if (!field.startsWith("spec.")) continue;
    const key = field.slice(5);
    if (value === null) delete specs[key];
    else if (scalar(value)) specs[key] = {
      value: typeof value === "string" ? plainText(value) : value,
      unit: specs[key]?.unit ?? defaultUnits[key] ?? null, source: "manual", date: null,
    };
  }

  const currency = typeof currencyCode === "string" && /^[A-Z]{3}$/.test(currencyCode) ? currencyCode : null;
  const priceOverride = row.overrides.get("price");
  const msrp = priceOverride === null || typeof priceOverride === "number" ? amount(priceOverride) : currency ? amount(publishedPrice) : null;
  const variants = dbPrices.filter(({variant}) => variant !== "");
  const offers = detail && currency ? variants.flatMap((row) =>
    row.currency === currency && row.price !== null && Number.isFinite(row.price) && row.price > 0 ? [row.price] : []) : [];
  const lowPrice = Math.min(...offers);
  const highPrice = Math.max(...offers);
  const product: CatalogView = {
    ...visuals, specs,
    offerRange: offers.length > 1 && lowPrice < highPrice ? {lowPrice, highPrice, offerCount: offers.length} : undefined,
    id: row.id, name: row.name, slug: row.slug, brand: row.brand, category: row.category, url: row.url,
    brandSlug: row.brandSlug, styleFamily: row.styleFamily ?? styleFamily ?? null,
    gender: productGender(row.gender, row.overrides.has("gender") ? undefined : unisex),
    subTags: row.subTags, isHardshell: row.isHardshell, status: row.status, verifiedAt,
    msrp, currency,
    taxonomy: classifyTaxonomy(adapter.taxonomy(row, {...payload, ...record(row.taxonomyPayload)}, row.overrides), row.overrides.get("parameters.taxonomy")),
  };
  product.parameters = adapter.parameters(product, {raw: payload, fetchedAt: row.payloadFetchedAt, indexed: dbSpecs, overrides: row.overrides});
  product.productType = classificationFilterValue(product.parameters.values.product_type ?? {state: "review", evidence: []});
  product.protectionType = classificationFilterValue(product.parameters.values.protection_type ?? {state: "unpublished", evidence: []});
  return product;
}

export function applyTaxonomyPresentation(product: CatalogView, taxonomy: TaxonomyResult | undefined) {
  const profile = product.parameters;
  if (!profile || !taxonomy) return product;
  const category = leafSlug(taxonomy);
  const evidence = profile.values.category?.evidence ?? [];
  return {...product, taxonomy, parameters: {...profile, values: {...profile.values, category: category
    ? known(category, evidence) : {...missing("review"), evidence}}}};
}

export function cardOnly(product: CatalogView): CatalogListing {
  const {slug, name, brand, category, gender, family, subTags, veilance, status, example,
    image, swatches, activities, msrp, currency, specs, taxonomy, modelNumbers, series} = product;
  const profile = parametersOf(product);
  const card = selectCardParameters(profile);
  return {id: product.id, slug, name, brand, category, gender, family, subTags, veilance, status, example, taxonomy, modelNumbers, series,
    image, swatches: swatches.slice(0, 5), swatchCount: swatches.length, activities, msrp, currency: example ? "USD" : currency,
    membrane: specs.membrane?.value,
    productType: classificationFilterValue(profile.values.product_type), protectionType: classificationFilterValue(profile.values.protection_type),
    brandSlug: product.brandSlug, styleFamily: product.styleFamily,
    releaseSeason: releaseSeasonRank(product.year, product.season), cardValueCount: countCardValues(card, profile), card};
}
