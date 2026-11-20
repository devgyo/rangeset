import {writeFile} from "node:fs/promises";
import pg from "pg";

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for read-only export");
  const db = new pg.Client({connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10_000});
  await db.connect();
  try {
    await db.query("BEGIN READ ONLY");
    const {rows} = await db.query(`
      SELECT p.slug, p.external_id AS "externalId", b.name AS brand, b.slug AS "brandSlug",
        p.name, p.category, p.gender, p.url, p.sub_tags AS "subTags", p.status,
        p.is_hardshell AS "isHardshell", p.analytics_family AS "styleFamily",
        p.last_seen AS "lastSeen", r.fetched_at AS "payloadFetchedAt",
        (SELECT jsonb_object_agg(key, value) FROM jsonb_each(r.payload)
          WHERE key IN ('marketingName','productType','category','subCategory','mainImage','colourOptions','activities',
            'breadcrumbs','shortDescription','description','weight','price','currencyCode','isUnisex','isFootwear',
            'features','materials','fit','origYear','origSeason','sizeOptions','manufacturingFacility','isPro')) AS payload,
        coalesce((SELECT jsonb_object_agg(field,value) FROM manual_overrides WHERE product_id = p.id), '{}') AS "overrideValues",
        coalesce((SELECT jsonb_agg(jsonb_build_object('key',key,'value',value,'unit',unit,'source',source,
          'fetchedAt',fetched_at,'sourceUrl',source_url,'rawText',raw_text)) FROM product_specs WHERE product_id = p.id), '[]') AS specs,
        coalesce((SELECT jsonb_agg(to_jsonb(latest)) FROM (
          SELECT DISTINCT ON (variant) variant, price::float8, currency, in_stock AS "inStock"
          FROM prices WHERE product_id = p.id AND channel = 'brand_us' ORDER BY variant, fetched_at DESC, id DESC
        ) latest), '[]') AS prices,
        (SELECT avg(in_stock::int)::float8 FROM prices WHERE product_id = p.id AND channel = 'brand_us'
          AND variant <> '' AND fetched_at = r.fetched_at) AS "stockRatio"
      FROM products p JOIN brands b ON b.id = p.brand_id LEFT JOIN product_raw r ON r.product_id = p.id
      WHERE b.slug = 'arcteryx' ORDER BY p.name,p.id
    `);
    await db.query("ROLLBACK");
    await writeFile("data/arcteryx-local.json", JSON.stringify(rows) + "\n");
    console.log(`Exported ${rows.length} Arc’teryx records via read-only transaction.`);
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
