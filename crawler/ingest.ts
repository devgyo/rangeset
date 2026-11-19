import { isDeepStrictEqual } from "node:util";
import { and, eq, inArray, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "../lib/db/schema";
import { nameFamily, type CatalogProduct, type Derived } from "./adapters/arcteryx";
import type { CrawlResult } from "./crawl";

const { products, productSpecs, productRaw, prices, changes } = schema;
type Db = NodePgDatabase<typeof schema>;
type Transaction = Parameters<Parameters<Db["transaction"]>[0]>[0];
type ProductRow = typeof products.$inferSelect;
type Audit = typeof changes.$inferInsert;
const channel = "brand_us";
const coreSpecs = new Set(["weight_g", "membrane", "layers", "face_denier"]);

function equivalent(previous: unknown, next: unknown) {
  // PostgreSQL JSONB sorts object keys. The payloads are JSON values, so deep
  // equality compares their structure without relying on key order.
  return isDeepStrictEqual(previous ?? null, next ?? null);
}

function needsReview(key: string, oldValue: unknown, newValue: unknown) {
  if (coreSpecs.has(key)) return true;
  return typeof oldValue === "number" && typeof newValue === "number" &&
    Math.abs(newValue - oldValue) > Math.abs(oldValue) / 10;
}

const textFields = [
  "marketingName", "analyticsName", "description", "fit", "materials", "features",
  "activities", "manufacturingFacility", "origYear", "origSeason", "mainImage",
  "colourOptions", "sizeOptions", "isUnisex", "isFootwear", "isPro",
] as const;

function variantDescriptors(raw: Record<string, unknown>) {
  const entries = Array.isArray(raw.variants) ? raw.variants : [];
  return Object.fromEntries(entries.flatMap((variant) =>
    variant && typeof variant.id === "string"
      ? [[variant.id, { colourId: variant.colourId ?? null, sizeId: variant.sizeId ?? null, upc: variant.upc ?? null }]]
      : []));
}

function reviewValue(field: string, candidate: unknown) {
  if (!field.startsWith("spec.") || !candidate || typeof candidate !== "object") return candidate;
  return specContent(candidate as Derived);
}

async function saveReview(tx: Transaction, audit: Audit) {
  const prior = await tx.select({ new: changes.new, old: changes.old }).from(changes).where(and(
    eq(changes.productId, audit.productId), eq(changes.field, audit.field),
    inArray(changes.status, ["needs_review", "rejected"]),
  ));
  if (prior.some((row) =>
    equivalent(reviewValue(audit.field, row.old), reviewValue(audit.field, audit.old)) &&
    equivalent(reviewValue(audit.field, row.new), reviewValue(audit.field, audit.new)))) return;
  await tx.insert(changes).values({ ...audit, status: "needs_review" });
}

async function upsertSpec(tx: Transaction, productId: number, key: string, spec: Derived) {
  await tx.insert(productSpecs).values({ productId, key, ...spec }).onConflictDoUpdate({
    target: [productSpecs.productId, productSpecs.key], set: spec,
  });
}

function specContent(spec: Pick<Derived, "value" | "unit" | "source">) {
  return { value: spec.value, unit: spec.unit, source: spec.source };
}

async function ingestProduct(tx: Transaction, brandId: number, record: CatalogProduct, previous?: ProductRow) {
  const metadata = {
    url: record.url, name: record.name, category: record.category, subTags: record.subTags, gender: record.gender,
    analyticsFamily: record.analyticsFamily, isHardshell: record.isHardshell,
  };
  const status = previous?.status === "pending_review" ? "pending_review" : "active";
  const [{ id }] = await tx.insert(products).values({
    ...metadata, brandId, externalId: record.externalId, slug: `arcteryx-${record.slug}`,
    firstSeen: record.fetchedAt, lastSeen: record.fetchedAt, status,
  }).onConflictDoUpdate({
    target: [products.brandId, products.externalId],
    set: { ...metadata, lastSeen: record.fetchedAt, consecutiveMisses: 0, status },
  }).returning({ id: products.id });

  const audit: Audit[] = [];
  const observe = (field: string, before: unknown, after: unknown) => {
    if (!equivalent(before, after)) audit.push({
      productId: id, field, old: before ?? null, new: after ?? null, status: "auto_applied", detectedAt: record.fetchedAt,
    });
  };

  if (previous) {
    for (const key of Object.keys(metadata) as (keyof typeof metadata)[]) observe(key, previous[key], metadata[key]);
    observe("status", previous.status, status);
    const [priorRaw] = await tx.select({ payload: productRaw.payload }).from(productRaw).where(eq(productRaw.productId, id));
    if (priorRaw) {
      for (const key of textFields) observe(key, priorRaw.payload[key], record.raw[key]);
      observe("variant_details", variantDescriptors(priorRaw.payload), variantDescriptors(record.raw));
    }
  }

  const oldSpecs = previous ? await tx.select().from(productSpecs).where(eq(productSpecs.productId, id)) : [];
  const oldByKey = new Map(oldSpecs.map((row) => [row.key, row]));
  for (const [key, spec] of Object.entries(record.specs)) {
    const old = oldByKey.get(key);
    const field = `spec.${key}`;
    const before = old && specContent(old);
    const after = specContent(spec);
    if (old && !equivalent(before, after)) {
      if (needsReview(key, old.value, spec.value)) {
        await saveReview(tx, {
          productId: id, field,
          old: { ...before, sourceUrl: old.sourceUrl, fetchedAt: old.fetchedAt, rawText: old.rawText },
          new: spec, detectedAt: record.fetchedAt, status: "needs_review",
        });
        continue;
      }
      observe(field, before, after);
    }
    await upsertSpec(tx, id, key, spec);
  }

  const lastPrices = previous ? await tx.selectDistinctOn([prices.variant], {
    variant: prices.variant, price: prices.price, currency: prices.currency, inStock: prices.inStock,
  }).from(prices).where(and(eq(prices.productId, id), eq(prices.channel, channel)))
    .orderBy(prices.variant, sql`${prices.fetchedAt} desc`) : [];
  const oldPrices = new Map(lastPrices.map((row) => [row.variant, row]));
  const observedPrices = new Map(record.prices.map((row) => [row.variant, row]));
  for (const old of lastPrices) {
    if (!observedPrices.has(old.variant) && ![old.price, old.currency, old.inStock].every((value) => value === null)) {
      observedPrices.set(old.variant, { variant: old.variant, price: null, currency: null, inStock: null });
    }
  }
  for (const row of observedPrices.values()) {
    const old = oldPrices.get(row.variant);
    if (previous) {
      const prefix = row.variant ? `variant.${row.variant}.` : "";
      observe(prefix + "price", old?.price == null ? null : { amount: old.price, currency: old.currency },
        row.price == null ? null : { amount: row.price, currency: row.currency });
      observe(prefix + "in_stock", old?.inStock, row.inStock);
    }
  }
  await tx.insert(prices).values([...observedPrices.values()].map((row) => ({
    ...row, productId: id, channel, fetchedAt: record.fetchedAt,
  }))).onConflictDoNothing();

  await tx.insert(productRaw).values({ productId: id, payload: record.raw, fetchedAt: record.fetchedAt })
    .onConflictDoUpdate({ target: productRaw.productId, set: { payload: record.raw, fetchedAt: record.fetchedAt } });
  if (audit.length) await tx.insert(changes).values(audit);
  return { ...previous, ...metadata, id, status, externalId: record.externalId, firstSeen: previous?.firstSeen ?? record.fetchedAt };
}

export async function ingest(db: Db, brandId: number, result: CrawlResult, detectedAt: string) {
  return db.transaction(async (tx) => {
    const previous = await tx.select().from(products).where(eq(products.brandId, brandId));
    const byExternalId = new Map(previous.map((entry) => [entry.externalId, entry]));
    const seen = [];
    const seenByUrl = new Map<string, string>();
    for (const record of result.records.values()) {
      seen.push(await ingestProduct(tx, brandId, record, byExternalId.get(record.externalId)));
      seenByUrl.set(record.url, record.externalId);
    }

    let discontinued = 0;
    for (const old of previous) {
      if (result.records.has(old.externalId)) continue;
      const urlReused = seenByUrl.has(old.url) && seenByUrl.get(old.url) !== old.externalId;
      if (!result.absent.has(old.url) && !urlReused) {
        if (old.consecutiveMisses && old.status !== "discontinued") {
          await tx.update(products).set({ consecutiveMisses: 0 }).where(eq(products.id, old.id));
        }
        continue;
      }

      const consecutiveMisses = old.consecutiveMisses + 1;
      const status = consecutiveMisses >= 3 ? "discontinued" : old.status;
      await tx.update(products).set({ consecutiveMisses, status }).where(eq(products.id, old.id));
      if (status !== old.status) {
        discontinued++;
        await tx.insert(changes).values({
          productId: old.id, field: "status", old: old.status, new: status, detectedAt, status: "auto_applied",
        });
      }

      if (old.successorId != null) continue;
      const family = nameFamily(old.name);
      const candidates = seen.filter((next) =>
        next.externalId !== old.externalId && new Date(next.firstSeen) >= new Date(old.lastSeen) &&
        next.gender === old.gender && next.category === old.category &&
        ((old.analyticsFamily && old.analyticsFamily === next.analyticsFamily) || (family && family === nameFamily(next.name))));
      if (candidates.length === 1) {
        await saveReview(tx, {
          productId: old.id, field: "successor_id", old: null, new: candidates[0].id,
          detectedAt, status: "needs_review",
        });
      }
    }
    return { ingested: seen.length, discontinued };
  });
}
