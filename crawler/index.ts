import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../lib/db/schema";
import { collect } from "./crawl";
import { ingest } from "./ingest";

async function run() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");
  if (new URL(url).hostname.includes("-pooler.")) throw new Error("Use a direct DATABASE_URL for the crawler");
  const client = new pg.Client({ connectionString: url, connectionTimeoutMillis: 15_000 });
  await client.connect();
  const db = drizzle(client, { schema });
  let runId: number | undefined;
  let stoppedReason: string | undefined;
  const counts = { ok: 0, failed: 0 };

  try {
    // A direct Neon connection keeps this session lock for the whole crawl.
    const { rows: [lock] } = await db.execute<{ acquired: boolean }>(sql`select pg_try_advisory_lock(617354209, 1) as acquired`);
    if (!lock.acquired) throw new Error("Another Arc'teryx crawl already holds the database lock");

    const [brand] = await db.insert(schema.brands).values({
      slug: "arcteryx", name: "Arc'teryx", website: "https://arcteryx.com",
    }).onConflictDoUpdate({ target: schema.brands.slug, set: { name: "Arc'teryx" } })
      .returning({ id: schema.brands.id });
    const [run] = await db.insert(schema.crawlRuns).values({
      brandId: brand.id, started: new Date().toISOString(),
    }).returning({ id: schema.crawlRuns.id });
    runId = run.id;

    const rows = await db.select({ url: schema.products.url }).from(schema.products).where(eq(schema.products.brandId, brand.id));
    const result = await collect(new Set(rows.map(({ url }) => url)), counts);
    const outcome = await ingest(db, brand.id, result, new Date().toISOString());
    console.log(JSON.stringify({ event: "ingest", runId, ...outcome }));
  } catch (error) {
    stoppedReason = error instanceof Error ? error.message : String(error);
    throw error;
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
}

run().catch((error: unknown) => {
  console.error(JSON.stringify({ event: "stopped", reason: error instanceof Error ? error.message : String(error) }));
  process.exitCode = 1;
});
