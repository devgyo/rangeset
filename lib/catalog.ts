import "server-only";

import {and, eq, inArray, desc, sql} from "drizzle-orm";
import {readFile} from "node:fs/promises";
import {cache} from "react";
import {unstable_cache} from "next/cache";
import {connection} from "next/server";
import {catalogDb} from "@/lib/db/read";
import {brands, manualOverrides, prices, products, productRaw, productSpecs} from "@/lib/db/schema";
import type {Jacket, Spec} from "@/lib/types";
import type {MammutProduct} from "@/crawler/adapters/mammut";
import exampleData from "@/data/jackets.json";
import type {ProductDetail} from "@/lib/product-view";
import {storedBrandPayload} from "@/lib/brands/db-payload";
import {brandAdapter} from "@/lib/brands";
import {classifyTaxonomy, consistentTaxonomy, matchesTaxonomy} from "@/lib/taxonomy";
import {applyTaxonomyPresentation, cardOnly, catalogSource, defaultUnits, isoDate, sourceIsVisible, toView, type CatalogView} from "@/lib/catalog/product";
import {fixtureProducts, mammutSource, type FixtureRow} from "@/lib/catalog/fixture";

export type {CatalogListing} from "@/lib/catalog/product";
export const localCatalog = process.env.RANGESET_LOCAL_CATALOG === "1" && !process.env.VERCEL;
export const catalogEnabled = localCatalog || Boolean(process.env.DATABASE_URL);

async function catalogRows(slugs?: string[], mode: "none" | "card" | "detail" = "none") {
  if (slugs && !slugs.length) return [];
  const db = catalogDb();
  const query = db.select({
    id: products.id, slug: products.slug, brand: brands.name, name: products.name,
    brandSlug: brands.slug, styleFamily: products.analyticsFamily,
    stockRatio: mode === "card" ? sql<number | null>`(
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
    ...storedBrandPayload(mode),
  }).from(products).innerJoin(brands, eq(products.brandId, brands.id)).leftJoin(productRaw, eq(productRaw.productId, products.id));
  const rows = await query.where(slugs ? inArray(products.slug, slugs) : undefined).orderBy(products.name, products.id);
  return rows.map(catalogSource).filter(sourceIsVisible);
}

export async function indexableProductSlugs() {
  await connection();
  const rows = localCatalog ? await listProducts() : await catalogRows();
  return rows.filter(({status}) => status !== "pending_review").map(({slug}) => slug);
}

export async function databaseJackets(slugs?: string[]): Promise<Jacket[]> {
  if (localCatalog) return [];
  const shells = new Set((await listProducts()).filter((row) => matchesTaxonomy(row, "hardshell-jackets")).map(({slug}) => slug));
  const rows = await catalogRows(slugs ? slugs.filter((slug) => shells.has(slug)) : [...shells]);
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
        value: price.price, unit: "USD", source: "brand", sourceUrl: row.url ?? undefined, verifiedAt: isoDate(price.fetchedAt),
      } : undefined;

    return {
      slug: row.slug, brand: row.brand, model: row.name, status: row.status,
      sourceUrl: row.url ?? undefined, verifiedAt: isoDate(row.lastSeen),
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
function byProduct<T extends { productId: number }>(rows: T[]) {
  const groups = new Map<number, T[]>();
  for (const row of rows) {
    const group = groups.get(row.productId);
    if (group) group.push(row);
    else groups.set(row.productId, [row]);
  }
  return groups;
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
      brandSlug: "arcteryx", styleFamily: null, stockRatio: null,
      subTags: [], veilance: false, isHardshell: true, taxonomy: classifyTaxonomy({waterproof: true, membrane: true}), status: item.status ?? "active", example: true,
      image: null, hero: null, swatches: [], activities: [], summary: "", msrp: item.specs.price?.value ?? null,
      inStock: null, specs, url: item.sourceUrl, verifiedAt: item.verifiedAt, description: "", materials: [], features: [],
      facility: "", year: null, season: "", sizes: [], colorways: [],
    };
  });
}

const localRows = cache(async (): Promise<FixtureRow[]> => {
  const [arc, mammut] = await Promise.all([
    readFile("data/arcteryx-local.json", "utf8").then((data) => JSON.parse(data) as FixtureRow[]),
    readFile("data/mammut-dry-run.json", "utf8").then((data) => JSON.parse(data) as {products: MammutProduct[]}),
  ]);
  return [...arc, ...mammut.products.map(mammutSource)];
});

async function loadProducts(mode: "card" | "detail", slugs?: string[]) {
  if (localCatalog) {
    return fixtureProducts(await localRows(), mode === "detail", slugs);
  }
  if (!catalogEnabled) return exampleProducts().filter((product) => brandAdapter(product.brandSlug).accepts(product, {}) && (!slugs || slugs.includes(product.slug)));
  const rows = await catalogRows(slugs, mode);
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

async function loadListing() {
  const views = consistentTaxonomy(await loadProducts("card"));
  const featured = views.find(({hero, status}) => hero && status === "active");
  return {
    cards: views.map(cardOnly),
    feature: featured && {hero: featured.hero, slug: featured.slug, name: featured.name, gender: featured.gender},
  };
}

const cachedListing = unstable_cache(loadListing, ["catalog-v1.8.0-with-mammut-product-lines"], {revalidate: 300});
const readListing = cache(catalogEnabled && !localCatalog ? cachedListing : loadListing);
export const listProducts = async () => (await readListing()).cards;
export const homeFeature = async () => (await readListing()).feature;

export async function readProducts(slugs: string[]) {
  if (!slugs.length) return [];
  const detail = await loadProducts("detail", slugs);
  if (!detail.length) return [];
  const classified = new Map((await listProducts()).map(({slug, taxonomy}) => [slug, taxonomy]));
  const bySlug = new Map(detail.map((product) => [product.slug, applyTaxonomyPresentation(product, classified.get(product.slug) ?? product.taxonomy)]));
  return slugs.flatMap((slug) => bySlug.get(slug) ?? []);
}

export const readProduct = cache(async (slug: string) => (await readProducts([slug]))[0]);

export async function relatedProducts(product: ProductDetail) {
  if (!product.family || !product.gender || product.example) return [];
  const cards = await listProducts();
  const selected = cards.find(({slug}) => slug === product.slug)?.taxonomy;
  if (selected?.state !== "classified") return [];
  const siblings = cards.filter((item) => item.slug !== product.slug && item.brand === product.brand && item.family === product.family &&
    item.gender === product.gender && item.taxonomy?.state === "classified" && item.taxonomy.leaf === selected.leaf);
  return loadProducts("detail", siblings.map(({slug}) => slug));
}
