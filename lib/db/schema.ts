import { sql } from "drizzle-orm";
import { type AnyPgColumn, boolean, check, index, integer, jsonb, numeric,
  pgEnum, pgTable, primaryKey, serial, text, timestamp, unique, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const productStatus = pgEnum("product_status", ["active", "discontinued", "pending_review"]);
export const specSource = pgEnum("spec_source", ["brand", "not_published"]);
export const reviewStatus = pgEnum("review_status", ["auto_applied", "needs_review", "approved", "rejected"]);
export type SpecValue = string | number | boolean | null;

const date = (name: string) => timestamp(name, { withTimezone: true, mode: "string" });

export const brands = pgTable("brands", {
  id: serial().primaryKey(),
  slug: text().notNull().unique(),
  name: text().notNull(),
  website: text().notNull(),
});

export const products = pgTable("products", {
  id: serial().primaryKey(),
  brandId: integer("brand_id").notNull().references(() => brands.id),
  externalId: text("external_id").notNull(),
  slug: text().notNull().unique(),
  url: text().notNull(),
  name: text().notNull(),
  category: text(),
  subTags: text("sub_tags").array().notNull().default(sql`ARRAY[]::text[]`),
  gender: text(),
  analyticsFamily: text("analytics_family"),
  isHardshell: boolean("is_hardshell").notNull().default(false),
  status: productStatus().notNull().default("active"),
  successorId: integer("successor_id").references((): AnyPgColumn => products.id),
  predecessorId: integer("predecessor_id").references((): AnyPgColumn => products.id),
  firstSeen: date("first_seen").notNull(),
  lastSeen: date("last_seen").notNull(),
  consecutiveMisses: integer("consecutive_misses").notNull().default(0),
}, (table) => [
  unique().on(table.brandId, table.externalId),
  index().on(table.category, table.name),
  index().on(table.isHardshell, table.name),
  check("nonnegative_misses", sql`${table.consecutiveMisses} >= 0`),
]);

export const productSpecs = pgTable("product_specs", {
  productId: integer("product_id").notNull().references(() => products.id),
  key: text().notNull(),
  value: jsonb().$type<SpecValue>(),
  unit: text(),
  source: specSource().notNull(),
  sourceUrl: text("source_url").notNull(),
  rawText: text("raw_text"),
  fetchedAt: date("fetched_at").notNull(),
}, (table) => [primaryKey({ columns: [table.productId, table.key] })]);

export const productRaw = pgTable("product_raw", {
  productId: integer("product_id").primaryKey().references(() => products.id),
  payload: jsonb().$type<Record<string, unknown>>().notNull(),
  fetchedAt: date("fetched_at").notNull(),
});

export const prices = pgTable("prices", {
  id: serial().primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id),
  variant: text().notNull().default(""),
  channel: text().notNull().default("brand_us"),
  price: numeric({ precision: 12, scale: 2, mode: "number" }),
  currency: text(),
  inStock: boolean("in_stock"),
  fetchedAt: date("fetched_at").notNull(),
}, (table) => [unique().on(table.productId, table.channel, table.variant, table.fetchedAt)]);

export const changes = pgTable("changes", {
  id: serial().primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id),
  field: text().notNull(),
  old: jsonb().$type<unknown>(),
  new: jsonb().$type<unknown>(),
  detectedAt: date("detected_at").notNull(),
  status: reviewStatus().notNull(),
}, (table) => [index().on(table.productId, table.field, table.status)]);

export const manualOverrides = pgTable("manual_overrides", {
  productId: integer("product_id").notNull().references(() => products.id),
  field: text().notNull(),
  value: jsonb().$type<unknown>(),
}, (table) => [primaryKey({ columns: [table.productId, table.field] })]);

export const crawlRuns = pgTable("crawl_runs", {
  id: serial().primaryKey(),
  brandId: integer("brand_id").notNull().references(() => brands.id),
  started: date("started").notNull(),
  finished: date("finished"),
  pagesOk: integer("pages_ok").notNull().default(0),
  pagesFailed: integer("pages_failed").notNull().default(0),
  stoppedReason: text("stopped_reason"),
}, (table) => [index().on(table.brandId, table.started)]);


export const priceSnapshotCrawlRuns = pgTable("price_snapshot_crawl_runs", {
  runId: uuid("run_id").primaryKey(),
  startedAt: date("started_at").notNull().defaultNow(),
  finishedAt: date("finished_at"),
  pagesDone: integer("pages_done").notNull().default(0),
  stoppedReason: text("stopped_reason"),
  stoppedAtPage: integer("stopped_at_page"),
});

export const priceSnapshots = pgTable("price_snapshots", {
  runId: uuid("run_id").notNull().references(() => priceSnapshotCrawlRuns.runId),
  productId: integer("product_id").notNull().references(() => products.id),
  variantKey: text("variant_key").notNull(),
  color: text(),
  size: text(),
  priceCents: integer("price_cents"),
  salePriceCents: integer("sale_price_cents"),
  currency: text(),
  inStock: boolean("in_stock"),
  status: text().$type<"ok" | "missing_404" | "blocked">().notNull(),
  sourceUrl: text("source_url").notNull(),
  capturedAt: date("captured_at").notNull(),
}, (table) => [
  uniqueIndex("price_snapshots_run_product_variant_idx").on(table.runId, table.productId, table.variantKey),
  index("price_snapshots_product_captured_idx").on(table.productId, table.capturedAt),
  check("price_snapshots_valid_status", sql`${table.status} in ('ok', 'missing_404', 'blocked')`),
]);
