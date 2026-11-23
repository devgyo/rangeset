import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../lib/db/schema";
import {arcLeafProductUrl, arcProductUrl} from "../lib/brand-urls";
import {collect, collectLeaf, type CrawlResult} from "./crawl";
import { ingest } from "./ingest";

// Two phases. The crawl itself never touches the database, so a slow or long
// crawl can't hold an idle connection open. Only once every page is fetched and
// parsed do we connect, take the lock, and write the whole run in one short session.

async function run() {
  const args = process.argv.slice(2);
  const leafOnly = args[0] === "--leaf";
  if (args.length > (leafOnly ? 1 : 0)) throw new Error("Usage: pnpm crawl:arcteryx [--leaf]");
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");
  if (new URL(url).hostname.includes("-pooler.")) throw new Error("Use a direct DATABASE_URL for the crawler");

  // Phase 1: crawl (network only).
  const started = new Date().toISOString();
  const counts = { ok: 0, failed: 0 };
  const completed: {result: CrawlResult; accepts: (url: string) => string | undefined}[] = [];
  const errors: string[] = [];
  const sources = [
    ...(!leafOnly ? [{name: "main", read: () => collect(new Set(), counts), accepts: arcProductUrl}] : []),
    {name: "leaf", read: () => collectLeaf(counts), accepts: arcLeafProductUrl},
  ];
  for (const {name, read, accepts} of sources) {
    try {
      completed.push({result: await read(), accepts});
    } catch (error) {
      errors.push(`${name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  let stoppedReason = errors.length ? errors.join("; ") : undefined;

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

    if (completed.length) {
      const result: CrawlResult = {
        discovered: new Set(completed.flatMap(({result}) => [...result.discovered])),
        records: new Map(),
        absent: new Set(completed.flatMap(({result}) => [...result.absent])),
        covers: (url) => completed.some(({accepts}) => Boolean(accepts(url))),
      };
      // Main-store records take precedence for SKUs in both catalogs.
      for (const source of completed) {
        for (const [sku, record] of source.result.records) {
          if (!result.records.has(sku)) result.records.set(sku, record);
        }
      }
      const rows = await db.select({url: schema.products.url, sku: schema.products.externalId})
        .from(schema.products).where(eq(schema.products.brandId, brand.id));
      const known = new Set(rows.map((row) => row.url));
      for (const row of rows) {
        if (result.covers?.(row.url) && !result.discovered.has(row.url)) result.absent.add(row.url);
        if (arcProductUrl(row.url) && arcLeafProductUrl(result.records.get(row.sku)?.url ?? "")) {
          result.records.delete(row.sku);
        }
      }
      console.log(JSON.stringify({
        event: "catalog_diff", known: known.size, discovered: result.discovered.size,
        new: [...result.discovered].filter((u) => !known.has(u)).length, absent: result.absent.size,
      }));
      const outcome = await ingest(db, brand.id, result, new Date().toISOString());
      console.log(JSON.stringify({ event: "ingest", runId, ...outcome }));
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    stoppedReason = stoppedReason ? stoppedReason + "; " + reason : reason;
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
