import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../lib/db/schema";
import { collect, type CrawlResult } from "./crawl";
import { ingest } from "./ingest";

// Two phases. The crawl itself never touches the database, so a slow or long
// crawl can't hold an idle connection open. Only once every page is fetched and
// parsed do we connect, take the lock, and write the whole run in one short session.

async function run() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");
  if (new URL(url).hostname.includes("-pooler.")) throw new Error("Use a direct DATABASE_URL for the crawler");

  // Phase 1: crawl (network only).
  const started = new Date().toISOString();
  const counts = { ok: 0, failed: 0 };
  let result: CrawlResult | undefined;
  let stoppedReason: string | undefined;
  try {
    result = await collect(new Set(), counts);
  } catch (error) {
    stoppedReason = error instanceof Error ? error.message : String(error);
  }

  // Phase 2: one short database session for the lock, run record, and ingest.
  const client = new pg.Client({ connectionString: url, connectionTimeoutMillis: 15_000 });
  await client.connect();
  const db = drizzle(client, { schema });
  let runId: number | undefined;
  try {
    const { rows: [lock] } = await db.execute<{ acquired: boolean }>(sql`select pg_try_advisory_lock(617354209, 1) as acquired`);
    if (!lock.acquired) throw new Error("Another Arc'teryx ingest already holds the database lock");

    const [brand] = await db.insert(schema.brands).values({
      slug: "arcteryx", name: "Arc'teryx", website: "https://arcteryx.com",
    }).onConflictDoUpdate({ target: schema.brands.slug, set: { name: "Arc'teryx" } })
      .returning({ id: schema.brands.id });
    const [crawlRun] = await db.insert(schema.crawlRuns).values({ brandId: brand.id, started })
      .returning({ id: schema.crawlRuns.id });
    runId = crawlRun.id;

    if (result) {
      // Products we already have that the sitemaps no longer list count as absent this run.
      const rows = await db.select({ url: schema.products.url }).from(schema.products).where(eq(schema.products.brandId, brand.id));
      const known = new Set(rows.map((row) => row.url));
      for (const productUrl of known) if (!result.discovered.has(productUrl)) result.absent.add(productUrl);
      console.log(JSON.stringify({
        event: "catalog_diff", known: known.size, discovered: result.discovered.size,
        new: [...result.discovered].filter((u) => !known.has(u)).length, absent: result.absent.size,
      }));
      const outcome = await ingest(db, brand.id, result, new Date().toISOString());
      console.log(JSON.stringify({ event: "ingest", runId, ...outcome }));
    }
  } catch (error) {
    stoppedReason ??= error instanceof Error ? error.message : String(error);
  } finally {
    try {
      if (runId !== undefined) await db.update(schema.crawlRuns).set({
        finished: new Date().toISOString(), stoppedReason,
        pagesOk: counts.ok, pagesFailed: counts.failed,
      }).where(eq(schema.crawlRuns.id, runId));
    } finally {
      await client.end();
      console.log(JSON.stringify({ event: "summary", runId, ...counts, stoppedReason }));
    }
  }
  if (stoppedReason) throw new Error(stoppedReason);
}

run().catch((error: unknown) => {
  console.error(JSON.stringify({ event: "stopped", reason: error instanceof Error ? error.message : String(error) }));
  process.exitCode = 1;
});
