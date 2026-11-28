import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../../lib/db/schema";
import { parseArcteryx, type CatalogProduct } from "../adapters/arcteryx";
import { fixtureUrl } from "../http";
import { ingest } from "../ingest";

const testUrl = process.env.TEST_DATABASE_URL;

test("ingests, reviews, preserves overrides, and reconciles product lifecycle", { skip: !testUrl }, async () => {
  const url = new URL(testUrl!);
  assert.ok(["127.0.0.1", "localhost"].includes(url.hostname) && url.pathname.endsWith("_test"),
    "Use a disposable local PostgreSQL database with a name ending in _test");

  const pool = new pg.Pool({ connectionString: testUrl });
  const db = drizzle(pool, { schema });
  const key = randomUUID();
  const day = (index: number) => new Date(Date.UTC(2026, 10, index)).toISOString();
  const fixture = readFileSync(new URL("./fixtures/beta-ar-jacket.html", import.meta.url), "utf8");
  const archived = parseArcteryx(fixture, fixtureUrl, day(1));
  const original = { ...archived, slug: `fixture-${key}`, externalId: `old-${key}` };
  const revised: CatalogProduct = {
    ...original, fetchedAt: day(2), name: original.name + " 2026",
    raw: { ...original.raw, description: "Updated description" },
    specs: {
      ...original.specs,
      weight_g: { ...original.specs.weight_g, value: 461, fetchedAt: day(2), rawText: "461g" },
      centre_back_length_cm: { ...original.specs.centre_back_length_cm, value: 100, fetchedAt: day(2) },
      fabric_gsm: { ...original.specs.fabric_gsm, value: 140, fetchedAt: day(2) },
    },
    prices: original.prices.map((price) => ({ ...price, price: 900 })),
  };
  const next = { ...revised, slug: `successor-${key}`, externalId: `new-${key}`, url: fixtureUrl + "-successor", fetchedAt: day(4) };

  try {
    const [brand] = await db.insert(schema.brands).values({ slug: key, name: "Integration test", website: "https://example.org" }).returning();
    const batch = (records: CatalogProduct[], absent: string[], date: string) => ingest(db, brand.id, {
      records: new Map(records.map((record) => [record.externalId, record])),
      discovered: new Set(records.map(({ url }) => url)), absent: new Set(absent),
    }, date);
    const getOriginal = async () => (await db.select().from(schema.products).where(and(
      eq(schema.products.brandId, brand.id), eq(schema.products.externalId, original.externalId),
    )))[0];

    await batch([original], [], day(1));
    const inserted = await getOriginal();
    assert.equal(inserted.status, "active");
    await db.insert(schema.manualOverrides).values({ productId: inserted.id, field: "spec.weight_g", value: 456 });

    await batch([revised], [], day(2));
    await batch([{ ...revised, fetchedAt: day(3) }], [], day(3));
    const live = await db.select().from(schema.productSpecs).where(eq(schema.productSpecs.productId, inserted.id));
    const spec = Object.fromEntries(live.map(({ key, value }) => [key, value]));
    assert.equal(spec.weight_g, 460);
    assert.equal(spec.centre_back_length_cm, 77);
    assert.equal(spec.fabric_gsm, 140);
    const history = await db.select().from(schema.prices).where(and(
      eq(schema.prices.productId, inserted.id), eq(schema.prices.variant, ""),
    )).orderBy(schema.prices.fetchedAt);
    assert.deepEqual(history.map(({ price, inStock }) => [price, inStock]), [[650, null], [900, null], [900, null]]);
    const overrides = await db.select().from(schema.manualOverrides).where(eq(schema.manualOverrides.productId, inserted.id));
    assert.equal(overrides[0].value, 456);

    const raw = await db.select().from(schema.productRaw).where(eq(schema.productRaw.productId, inserted.id));
    assert.equal(raw[0].payload.description, "Updated description");
    const audit = await db.select().from(schema.changes).where(eq(schema.changes.productId, inserted.id));
    assert.deepEqual(audit.filter(({ status }) => status === "needs_review").map(({ field }) => field).sort(),
      ["spec.centre_back_length_cm", "spec.weight_g"]);
    assert.ok(audit.every(({field}) => !field.endsWith("in_stock")));
    for (const field of ["name", "description", "price", "spec.fabric_gsm"]) {
      assert.equal(audit.find((change) => change.field === field)?.status, "auto_applied", field);
    }

    await batch([next], [fixtureUrl], day(4));
    await batch([], [fixtureUrl], day(5));
    assert.equal((await getOriginal()).consecutiveMisses, 2);
    assert.equal((await getOriginal()).status, "active");
    await batch([], [fixtureUrl], day(6));
    assert.equal((await getOriginal()).status, "discontinued");
    const candidates = await db.select().from(schema.changes).where(and(
      eq(schema.changes.productId, inserted.id), eq(schema.changes.field, "successor_id"),
    ));
    assert.equal(candidates.length, 1);
    assert.equal(candidates[0].status, "needs_review");
    assert.equal((await getOriginal()).successorId, null);

    await batch([{ ...revised, fetchedAt: day(7) }], [], day(7));
    assert.equal((await getOriginal()).status, "active");
    assert.equal((await getOriginal()).consecutiveMisses, 0);
  } finally {
    await pool.end();
  }
});
