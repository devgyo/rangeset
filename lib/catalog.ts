import "server-only";

import { and, eq, inArray, desc } from "drizzle-orm";
import { connection } from "next/server";
import { catalogDb } from "@/lib/db/read";
import { brands, manualOverrides, prices, products, productSpecs } from "@/lib/db/schema";
import type { Jacket, Spec } from "@/lib/types";

export const catalogEnabled = Boolean(process.env.DATABASE_URL);

async function catalogRows(slugs?: string[]) {
  if (slugs && !slugs.length) return [];
  await connection();
  const db = catalogDb();
  const rows = await db.select({
    id: products.id, slug: products.slug, brand: brands.name, name: products.name,
    category: products.category, gender: products.gender, url: products.url,
    status: products.status, lastSeen: products.lastSeen, isHardshell: products.isHardshell,
  }).from(products).innerJoin(brands, eq(products.brandId, brands.id))
    .where(slugs ? inArray(products.slug, slugs) : undefined).orderBy(products.name, products.id);
  if (!rows.length) return [];

  const overrides = await db.select().from(manualOverrides)
    .where(inArray(manualOverrides.productId, rows.map(({ id }) => id)));
  const overrideMaps = new Map<number, Map<string, unknown>>();
  for (const { productId, field, value } of overrides) {
    let map = overrideMaps.get(productId);
    if (!map) overrideMaps.set(productId, map = new Map());
    map.set(field, value);
  }

  return rows.map((row) => {
    const overrides = overrideMaps.get(row.id) ?? new Map<string, unknown>();
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
  });
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

export async function listProducts() {
  return (await catalogRows()).map(({ slug, brand, name, category, gender, url, status, isHardshell }) =>
    ({ slug, brand, name, category, gender, url, status, isHardshell }));
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
