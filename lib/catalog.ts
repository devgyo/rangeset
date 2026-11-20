import "server-only";

import { and, eq, inArray, desc, sql, or, ilike, exists } from "drizzle-orm";
import { cache } from "react";
import { connection } from "next/server";
import { catalogDb } from "@/lib/db/read";
import { brands, manualOverrides, prices, products, productRaw, productSpecs } from "@/lib/db/schema";
import type { Jacket, Spec } from "@/lib/types";
import exampleData from "@/data/jackets.json";
import {
  categorySpecs, colorwaysOf, featuresOf, plainText, productFamily, productGender, record, safeImage, swatchesOf, textList,
  type CatalogCard, type CatalogSpec, type ProductDetail,
} from "@/lib/arcteryx-view";

import {isCatalogProduct} from "@/lib/catalog-scope";
import {countCardValues, selectCardParameters, type CardParameters} from "@/lib/parameters/card";
import {releaseSeasonRank, type FeaturedProduct} from "@/lib/catalog/featured-sort";
import { classificationFilterValue } from "@/lib/parameters/classification";
import { normalizeArcProduct, parametersOf, type IndexedSpec } from "@/lib/parameters/arcteryx";

export const catalogEnabled = Boolean(process.env.DATABASE_URL);

const raw = productRaw.payload;
const classificationPayload = sql<Record<string, unknown>>`jsonb_build_object(
  'marketingName', ${raw}->'marketingName', 'productType', ${raw}->'productType',
  'category', ${raw}->'category', 'subCategory', ${raw}->'subCategory'
)`;
const cardPayload = sql<Record<string, unknown>>`jsonb_build_object(
  'image', ${raw} #>> '{colourOptions,0,image,url}',
  'mainImage', jsonb_build_object('url', ${raw} #>> '{mainImage,url}'),
  'colourOptions', (select jsonb_agg(jsonb_build_object('label', colour->'label', 'hexCode', colour->'hexCode') order by position)
    from jsonb_array_elements(case when jsonb_typeof(${raw}->'colourOptions') = 'array' then ${raw}->'colourOptions' else '[]'::jsonb end)
    with ordinality as colors(colour, position)),
  'activities', ${raw}->'activities',
  'veilance', jsonb_path_exists(${raw}, '$.breadcrumbs[*] ? (@.label like_regex "^Veilance$" flag "i" || @.url like_regex "(^|/)veilance(/|$)" flag "i")'),
  'shortDescription', left(${raw}->>'shortDescription', 6000),
  'weight', ${raw}->'weight', 'price', ${raw}->'price', 'currencyCode', ${raw}->'currencyCode', 'isUnisex', ${raw}->'isUnisex',
  'features', case when ${products.category} = 'Insulated Jackets' then
    jsonb_path_query_array(${raw}, '$.features[*] ? (@.label like_regex "insulation|construction" flag "i")') end,
  'materials', case when ${products.category} = 'Insulated Jackets' then
    jsonb_path_query_array(${raw}, '$.materials[*] ? (@ like_regex "down|insulation|coreloft|primaloft|octa|climashield|polartec alpha" flag "i")') end
) || ${classificationPayload}`;

const catalogCardPayload = sql<Record<string, unknown>>`${cardPayload} || jsonb_build_object(
  'materials', ${raw}->'materials', 'fit', ${raw}->'fit',
  'origYear', ${raw}->'origYear', 'origSeason', ${raw}->'origSeason'
)`;

type Scope = { category: string; family: string };
async function catalogRows(slugs?: string[], mode: "none" | "card" | "detail" = "none", scope?: Scope) {
  if (slugs && !slugs.length) return [];
  await connection();
  const db = catalogDb();
  const scoped = scope ? or(
    and(eq(products.category, scope.category), ilike(products.name, scope.family + "%")),
    exists(db.select({ field: manualOverrides.field }).from(manualOverrides)
      .where(and(eq(manualOverrides.productId, products.id), inArray(manualOverrides.field, ["name", "category"])))),
  ) : undefined;
  const query = db.select({
    id: products.id, slug: products.slug, brand: brands.name, name: products.name,
    brandSlug: brands.slug, styleFamily: products.analyticsFamily,
    stockRatio: mode === "card" && !scope ? sql<number | null>`(
      select avg(${prices.inStock}::int)::float8
      from ${prices}
      where ${prices.productId} = ${products.id}
        and ${prices.channel} = 'brand_us' and ${prices.variant} <> ''
        and ${prices.fetchedAt} = ${productRaw.fetchedAt}
    )` : sql<null>`null`,
    category: products.category, gender: products.gender, url: products.url,
    status: products.status, lastSeen: products.lastSeen, isHardshell: products.isHardshell, subTags: products.subTags,
    overrideValues: sql<Record<string, unknown>>`coalesce((
      select jsonb_object_agg(override.field, override.value)
      from ${manualOverrides} as override
      where override.product_id = ${products.id}
    ), '{}'::jsonb)`,
    payloadFetchedAt: mode === "detail" ? productRaw.fetchedAt : sql<null>`null`,
    payload: mode === "card" ? (scope ? cardPayload : catalogCardPayload) : mode === "detail" ? raw : classificationPayload,
  }).from(products).innerJoin(brands, eq(products.brandId, brands.id)).leftJoin(productRaw, eq(productRaw.productId, products.id));
  const rows = await query.where(slugs ? inArray(products.slug, slugs) : scoped).orderBy(products.name, products.id);
  return rows.map(({ overrideValues, ...row }) => {
    const overrides = new Map(Object.entries(overrideValues));
    const name = overrides.get("name");
    const category = overrides.get("category");
    const gender = overrides.get("gender");
    const hardshell = overrides.get("isHardshell");
    const status = overrides.get("status");
    return {
      ...row, overrides,
      name: typeof name === "string" && name.trim() ? name : row.name,
      category: typeof category === "string" || category === null ? category : row.category,
      gender: typeof gender === "string" || gender === null ? gender : row.gender,
      isHardshell: typeof hardshell === "boolean" ? hardshell : row.isHardshell,
      status: status === "active" || status === "discontinued" || status === "pending_review" ? status : row.status,
      url: safeSource(overrides.get("url")) ?? row.url,
    };
  }).filter((row) => isCatalogProduct(row, {raw: record(row.payload), overrides: row.overrides}));
}

function safeSource(value: unknown) {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : undefined;
  } catch {
    return undefined;
  }
}

function isoDate(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

export async function indexableProductSlugs() {
  return (await catalogRows()).filter(({ status }) => status !== "pending_review").map(({ slug }) => slug);
}

export async function databaseJackets(slugs?: string[]): Promise<Jacket[]> {
  const rows = (await catalogRows(slugs)).filter((row) => row.isHardshell);
  if (!rows.length) return [];

  const db = catalogDb();
  const ids = rows.map((row) => row.id);
  const [specs, latestPrices] = await Promise.all([
    db.select().from(productSpecs).where(inArray(productSpecs.productId, ids)),
    db.selectDistinctOn([prices.productId]).from(prices).where(and(
      inArray(prices.productId, ids), eq(prices.variant, ""), eq(prices.channel, "brand_us"),
    )).orderBy(prices.productId, desc(prices.fetchedAt)),
  ]);
  const byProduct = new Map<number, Map<string, typeof productSpecs.$inferSelect>>();
  for (const spec of specs) {
    let map = byProduct.get(spec.productId);
    if (!map) byProduct.set(spec.productId, map = new Map());
    map.set(spec.key, spec);
  }
  const priceByProduct = new Map(latestPrices.map((price) => [price.productId, price]));

  return rows.map((row) => {
    const entries = byProduct.get(row.id);
    const get = <T extends string | boolean | number>(key: string, valid: (value: unknown) => value is T): Spec<T> | undefined => {
      const field = `spec.${key}`;
      if (row.overrides.has(field)) {
        const override = row.overrides.get(field);
        if (override === null) return { value: null, source: "not_published" };
        if (valid(override)) return { value: override, source: "manual" };
      }
      const spec = entries?.get(key);
      if (!spec) return undefined;
      const provenance = { unit: spec.unit ?? undefined, sourceUrl: spec.sourceUrl, verifiedAt: isoDate(spec.fetchedAt) };
      return spec.source === "brand" && valid(spec.value)
        ? { ...provenance, value: spec.value, source: "brand" }
        : { ...provenance, value: null, source: "not_published" };
    };
    const measuredBreathability = get("breathability", isNumber);
    const breathabilityMethod = get("breathability_method", isString)?.value;
    const breathability = measuredBreathability && { ...measuredBreathability, method: breathabilityMethod ?? undefined };
    const price = priceByProduct.get(row.id);
    const priceOverride = row.overrides.get("price");
    const priceSpec: Spec<number> | undefined = priceOverride === null
      ? { value: null, source: "not_published" }
      : typeof priceOverride === "number" ? { value: priceOverride, unit: "USD", source: "manual" }
      : price?.price != null && price.currency === "USD" ? {
        value: price.price, unit: "USD", source: "brand", sourceUrl: row.url, verifiedAt: isoDate(price.fetchedAt),
      } : undefined;

    return {
      slug: row.slug, brand: row.brand, model: row.name, status: row.status,
      sourceUrl: row.url, verifiedAt: isoDate(row.lastSeen),
      specs: {
        membrane: get("membrane", isString), layers: get("layers", isNumber),
        faceDenier: get("face_denier", isNumber), weight: get("weight_g", isNumber), weightSize: get("weight_size", isString),
        backLength: get("centre_back_length_cm", isNumber), waterproof: get("waterproof_mm", isNumber),
        breathability, fit: get("fit", isString),
        price: priceSpec, pitZips: get("pit_zips", isBoolean), helmetHood: get("helmet_hood", isBoolean),
      },
    };
  });
}

const isString = (value: unknown): value is string => typeof value === "string";
const isNumber = (value: unknown): value is number => typeof value === "number";
const isBoolean = (value: unknown): value is boolean => typeof value === "boolean";

const cardSpecKeys = ["weight_g", "membrane", "layers", "face_denier", "fabric_gsm", "inseam", "fit"];
const defaultUnits: Record<string, string> = {
  weight_g: "g", layers: "layers", face_denier: "D", fabric_gsm: "g/m²", centre_back_length_cm: "cm", inseam: "cm",
  waterproof_mm: "mm",
};

function scalar(value: unknown): value is CatalogSpec["value"] {
  return typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value)) ||
    (typeof value === "string" && Boolean(plainText(value)));
}

function msrpAmount(value: unknown) {
  const parsed = typeof value === "number" || (typeof value === "string" && /^\d+(?:\.\d+)?$/.test(value.trim()))
    ? Number(value) : null;
  return parsed != null && Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

type CatalogRow = Awaited<ReturnType<typeof catalogRows>>[number];
type PriceRow = Pick<typeof prices.$inferSelect, "productId" | "variant" | "price" | "currency" | "inStock">;
type SpecRow = IndexedSpec & { productId: number };

function byProduct<T extends { productId: number }>(rows: T[]) {
  const groups = new Map<number, T[]>();
  for (const row of rows) {
    const group = groups.get(row.productId);
    if (group) group.push(row);
    else groups.set(row.productId, [row]);
  }
  return groups;
}

type CatalogView = ProductDetail & Pick<FeaturedProduct, "brandSlug" | "styleFamily" | "stockRatio">;

function toView(row: CatalogRow, dbSpecs: SpecRow[], dbPrices: PriceRow[], detail: boolean): CatalogView {
  const payload = record(row.payload);
  const features = featuresOf(payload.features);
  const materials = textList(payload.materials);
  const verifiedAt = isoDate(row.lastSeen);
  const specs = categorySpecs(row.category, materials, features, verifiedAt);
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
  const priceOverride = row.overrides.get("price");
  const variantStates = dbPrices.filter(({ variant }) => variant !== "").map(({ inStock }) => inStock);
  const variantStock = variantStates.includes(true) ? true
    : variantStates.length && variantStates.every((state) => state === false) ? false : null;
  const currency = typeof payload.currencyCode === "string" && /^[A-Z]{3}$/.test(payload.currencyCode) ? payload.currencyCode : null;
  const msrp = priceOverride === null || typeof priceOverride === "number" ? msrpAmount(priceOverride)
    : currency ? msrpAmount(payload.price) : null;
  const colorOptions = payload.colourOptions;
  const summary = plainText(payload.shortDescription);
  const veilance = payload.veilance === true || entriesOfBreadcrumbs(payload.breadcrumbs);
  const product: CatalogView = {
    name: row.name, slug: row.slug, brand: row.brand, category: row.category, url: row.url,
    brandSlug: row.brandSlug, styleFamily: row.styleFamily, stockRatio: row.stockRatio,
    gender: productGender(row.gender, row.overrides.has("gender") ? undefined : payload.isUnisex),
    family: productFamily(row.name), subTags: row.subTags, veilance, isHardshell: row.isHardshell, status: row.status,
    image: safeImage(payload.image ?? record(record((Array.isArray(colorOptions) ? colorOptions : [])[0]).image).url),
    hero: safeImage(record(payload.mainImage).url), swatches: swatchesOf(colorOptions),
    summary, msrp, currency, inStock: dbPrices.find(({ variant }) => variant === "")?.inStock ?? variantStock,
    activities: textList(payload.activities), specs, verifiedAt,
    description: detail ? plainText(payload.description) : "", materials: detail ? materials : [],
    features: detail ? features : [], facility: plainText(record(payload.manufacturingFacility).label),
    year: /^\d{4}$/.test(String(payload.origYear)) ? Number(payload.origYear) : null,
    season: plainText(payload.origSeason),
    sizes: (Array.isArray(record(payload.sizeOptions).options) ? record(payload.sizeOptions).options as unknown[] : [])
      .map((option) => plainText(record(option).label)).filter(Boolean),
    colorways: detail ? colorwaysOf(colorOptions) : [],
  };
  product.parameters = normalizeArcProduct(product, {raw: payload, fetchedAt: row.payloadFetchedAt, indexed: dbSpecs, overrides: row.overrides});
  product.productType = classificationFilterValue(product.parameters.values.product_type);
  product.protectionType = classificationFilterValue(product.parameters.values.protection_type);
  return product;
}

function entriesOfBreadcrumbs(value: unknown) {
  return Array.isArray(value) && value.map(record).some(({ label, url }) =>
    plainText(label).toLowerCase() === "veilance" || (typeof url === "string" && /(?:^|\/)veilance(?:\/|$)/i.test(url)));
}

function exampleProducts(): CatalogView[] {
  const keys = {
    weight: "weight_g", weightSize: "weight_size", membrane: "membrane", layers: "layers", faceDenier: "face_denier",
    backLength: "centre_back_length_cm", fit: "fit", pitZips: "pit_zips", helmetHood: "helmet_hood",
    waterproof: "waterproof_mm", breathability: "breathability",
  } as const;
  return (exampleData as Jacket[]).map((item) => {
    const specs: ProductDetail["specs"] = {};
    for (const [field, key] of Object.entries(keys)) {
      const spec = item.specs[field as keyof typeof keys];
      if (spec && spec.source !== "not_published") specs[key] = {
        value: spec.value, unit: spec.unit ?? defaultUnits[key] ?? null, source: spec.source, date: spec.verifiedAt ?? item.verifiedAt,
      };
    }
    return {
      slug: item.slug, brand: item.brand, name: item.model, category: "Shell Jackets", gender: null, family: null,
      brandSlug: item.brand.toLowerCase(), styleFamily: null, stockRatio: null,
      subTags: [], veilance: false, isHardshell: true, status: item.status ?? "active", example: true,
      image: null, hero: null, swatches: [], activities: [], summary: "", msrp: item.specs.price?.value ?? null,
      inStock: null, specs, url: item.sourceUrl, verifiedAt: item.verifiedAt, description: "", materials: [], features: [],
      facility: "", year: null, season: "", sizes: [], colorways: [],
    };
  });
}

async function loadProducts(mode: "card" | "detail", slugs?: string[], scope?: Scope) {
  if (!catalogEnabled) return exampleProducts().filter((product) => isCatalogProduct(product) && (!slugs || slugs.includes(product.slug)));
  const rows = await catalogRows(slugs, mode, scope);
  if (!rows.length) return [];
  const db = catalogDb();
  const ids = rows.map(({ id }) => id);
  const [specs, latest] = await Promise.all([
    mode === "card" ? db.select({
      productId: productSpecs.productId, key: productSpecs.key, value: productSpecs.value, unit: productSpecs.unit,
      source: productSpecs.source, fetchedAt: productSpecs.fetchedAt,
    }).from(productSpecs).where(and(inArray(productSpecs.productId, ids), inArray(productSpecs.key, cardSpecKeys)))
      : db.select().from(productSpecs).where(inArray(productSpecs.productId, ids)),
    db.selectDistinctOn([prices.productId, prices.variant], {
      productId: prices.productId, variant: prices.variant,
      price: prices.price, currency: prices.currency, inStock: prices.inStock,
    }).from(prices).where(and(inArray(prices.productId, ids), eq(prices.channel, "brand_us"),
      mode === "card" ? eq(prices.variant, "") : undefined))
      .orderBy(prices.productId, prices.variant, desc(prices.fetchedAt), desc(prices.id)),
  ]);
  const specsByProduct = byProduct(specs);
  const pricesByProduct = byProduct(latest);
  return rows.map((row) => toView(row, specsByProduct.get(row.id) ?? [], pricesByProduct.get(row.id) ?? [], mode === "detail"));
}

export type CatalogListing = CatalogCard & FeaturedProduct & {card: CardParameters};

function cardOnly(product: CatalogView): CatalogListing {
  const { slug, name, brand, category, gender, family, subTags, veilance, isHardshell, status, example,
    image, hero, swatches, activities, summary, msrp, currency, inStock, specs } = product;
  const profile = parametersOf(product);
  const card = selectCardParameters(profile);
  return { slug, name, brand, category, gender, family, subTags, veilance, isHardshell, status, example,
    image, hero, swatches, activities, summary, msrp, currency: example ? "USD" : currency, inStock, specs,
    productType: classificationFilterValue(profile.values.product_type), protectionType: classificationFilterValue(profile.values.protection_type),
    brandSlug: product.brandSlug, styleFamily: product.styleFamily, stockRatio: product.stockRatio,
    releaseSeason: releaseSeasonRank(product.year, product.season), cardValueCount: countCardValues(card, profile), card };
}

export const listProducts = cache(async () => (await loadProducts("card")).map(cardOnly));

export async function readProducts(slugs: string[]) {
  const bySlug = new Map((await loadProducts("detail", slugs)).map((product) => [product.slug, product]));
  return slugs.flatMap((slug) => bySlug.get(slug) ?? []);
}

export const readProduct = cache(async (slug: string) => (await readProducts([slug]))[0]);

export async function relatedProducts(product: ProductDetail) {
  if (!product.category || !product.family || !product.gender || product.example) return [];
  const candidates = await loadProducts("card", undefined, { category: product.category, family: product.family });
  return candidates.filter((item) => item.slug !== product.slug && item.family === product.family &&
    item.category === product.category && item.gender === product.gender);
}
