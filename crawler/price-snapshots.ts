import {setTimeout as delay} from "node:timers/promises";
import {eq, sql} from "drizzle-orm";
import {drizzle} from "drizzle-orm/node-postgres";
import pg from "pg";
import {storedBrandPayload} from "../lib/brands/db-payload";
import {catalogBrand} from "../lib/catalog-scope";
import {catalogSource, sourceIsVisible} from "../lib/catalog/product";
import {brands, manualOverrides, priceSnapshotCrawlRuns as runs, priceSnapshots, productRaw, products} from "../lib/db/schema";
import {arcPolicyFor, CrawlPolicyDenied, CrawlStop, PoliteClient} from "./http";
import {mammutPolicy} from "./mammut-source";
import {captureRun, emptyIssueCounts, isSnapshotTimeout, snapshotRunId, type Target} from "./snapshot-run";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required");
  if (new URL(connectionString).hostname.includes("-pooler")) throw new Error("Use a direct database connection");
  const runId = snapshotRunId(process.env.SNAPSHOT_RUN_ID, process.env.GITHUB_RUN_ID);
  const pool = new pg.Pool({connectionString, connectionTimeoutMillis: 10_000});
  try {
    const db = drizzle(pool);
    await db.insert(runs).values({runId}).onConflictDoNothing();
    const [run] = await db.select().from(runs).where(eq(runs.runId, runId));
    if (run.finishedAt) {
      console.log({runId, pagesDone: run.pagesDone, stoppedReason: run.stoppedReason, issues: emptyIssueCounts(), resumedFinishedRun: true});
      if (run.stoppedReason) process.exitCode = 1;
      return;
    }

    const [prior, rows] = await Promise.all([
      db.selectDistinct({productId: priceSnapshots.productId}).from(priceSnapshots).where(eq(priceSnapshots.runId, runId)),
      db.select({
        id: products.id, sku: products.externalId, slug: products.slug, name: products.name, url: products.url,
        brand: brands.name, brandSlug: brands.slug, status: products.status, category: products.category,
        gender: products.gender, subTags: products.subTags, isHardshell: products.isHardshell,
        styleFamily: products.analyticsFamily, lastSeen: products.lastSeen,
        stockRatio: sql<null>`null`, payloadFetchedAt: productRaw.fetchedAt,
        overrideValues: sql<Record<string, unknown>>`coalesce((
          select jsonb_object_agg(override.field, override.value)
          from ${manualOverrides} as override where override.product_id = ${products.id}
        ), '{}'::jsonb)`,
        ...storedBrandPayload("none"),
      }).from(products).innerJoin(brands, eq(brands.id, products.brandId))
        .leftJoin(productRaw, eq(productRaw.productId, products.id))
        .where(eq(brands.slug, catalogBrand)).orderBy(products.id),
    ]);
    const targets: Target[] = rows.flatMap((row) => {
      const source = catalogSource(row);
      return source.status !== "discontinued" && sourceIsVisible(source)
        ? [{id: row.id, sku: row.sku, url: row.url, brand: row.brandSlug as Target["brand"]}] : [];
    });
    let origin: string | undefined;
    let client: PoliteClient | undefined;
    let robotsUnavailable = false;
    await captureRun(targets, new Set(prior.map(({productId}) => productId)), async (target) => {
      const policy = target.brand === "arcteryx" ? arcPolicyFor(target.url) : mammutPolicy;
      const url = policy.productUrl(target.url);
      if (!url) throw new CrawlPolicyDenied("URL outside the public product scope");
      if (!client || origin !== policy.origin) {
        if (origin) await delay(1500);
        origin = policy.origin;
        robotsUnavailable = false;
        client = new PoliteClient(undefined, policy);
        try {
          await client.loadRobots();
        } catch (error) {
          // No product request was sent, so record only run-level information.
          robotsUnavailable = true;
          if (error instanceof CrawlPolicyDenied || isSnapshotTimeout(error)) throw error;
          if (error instanceof CrawlStop) throw new CrawlStop(error.message);
          throw error;
        }
      }
      if (robotsUnavailable || !client.allows(url)) throw new CrawlPolicyDenied("Disallowed or unavailable robots.txt");
      return client.request(url, "product");
    }, {
      save: (observations, pagesDone) => db.transaction(async (tx) => {
        await tx.insert(priceSnapshots).values(observations.map((row) => ({...row, runId}))).onConflictDoNothing();
        await tx.update(runs).set({pagesDone}).where(eq(runs.runId, runId));
      }),
      finish: ({issues, ...progress}, blocked) => db.transaction(async (tx) => {
        if (blocked) await tx.insert(priceSnapshots).values({...blocked, runId}).onConflictDoNothing();
        await tx.update(runs).set({...progress, finishedAt: new Date().toISOString()}).where(eq(runs.runId, runId));
        console.log({runId, ...progress, issues});
      }),
    });
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof CrawlStop ? error.message : "Snapshot job failed. Check configuration, database connectivity and the run record.");
  process.exitCode = 1;
});
