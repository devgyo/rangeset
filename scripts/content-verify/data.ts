import {Client} from "pg";
import type {IndexedSpec} from "../../lib/brands/types";
import {catalogSource, sourceIsVisible, type CatalogSource, type PriceRow} from "../../lib/catalog/product";

export type Brand = "arcteryx" | "mammut";
export type Snapshot = {variantKey: string; priceCents: number | null; salePriceCents: number | null; currency: string | null};
type Row = CatalogSource & {
  sku: string; brandSlug: Brand; payload: Record<string, unknown> | null;
  specs: IndexedSpec[]; prices: PriceRow[]; snapshots: Snapshot[]; recent: boolean;
};
export type AuditProduct = ReturnType<typeof catalogSource<Row>>;

export async function readInventory(connectionString: string) {
  const db = new Client({connectionString, options: "-c default_transaction_read_only=on",
    connectionTimeoutMillis: 10_000, statement_timeout: 90_000});
  await db.connect();
  try {
    const {rows} = await db.query<Row>(`
      SELECT p.id, p.external_id AS sku, p.slug, p.name, p.url, b.name AS brand, b.slug AS "brandSlug",
        p.status, p.category, p.gender, p.sub_tags AS "subTags", p.is_hardshell AS "isHardshell",
        p.analytics_family AS "styleFamily", p.last_seen::text AS "lastSeen",
        null AS "stockRatio", r.payload, r.fetched_at::text AS "payloadFetchedAt",
        (p.first_seen >= now() - interval '7 days' OR EXISTS (
          SELECT FROM changes c WHERE c.product_id = p.id AND c.detected_at >= now() - interval '7 days'
        )) AS recent,
        coalesce((SELECT jsonb_object_agg(o.field, o.value) FROM manual_overrides o WHERE o.product_id = p.id), '{}') AS "overrideValues",
        coalesce((SELECT jsonb_agg(jsonb_build_object('key', s.key, 'value', s.value, 'unit', s.unit,
          'source', s.source, 'fetchedAt', s.fetched_at, 'sourceUrl', s.source_url, 'rawText', s.raw_text))
          FROM product_specs s WHERE s.product_id = p.id), '[]') AS specs,
        coalesce((SELECT jsonb_agg(jsonb_build_object('variant', q.variant, 'price', q.price,
          'currency', q.currency, 'inStock', q.in_stock)) FROM prices q WHERE q.product_id = p.id
          AND q.channel = 'brand_us' AND q.fetched_at = r.fetched_at), '[]') AS prices,
        coalesce((SELECT jsonb_agg(jsonb_build_object('variantKey', s.variant_key, 'priceCents', s.price_cents,
          'salePriceCents', s.sale_price_cents, 'currency', s.currency)) FROM price_snapshots s
          WHERE s.product_id = p.id AND s.status = 'ok' AND s.run_id = (
            SELECT latest.run_id FROM price_snapshots latest WHERE latest.product_id = p.id AND latest.status = 'ok'
            ORDER BY latest.captured_at DESC, latest.run_id DESC LIMIT 1
          )), '[]') AS snapshots
      FROM products p JOIN brands b ON b.id = p.brand_id LEFT JOIN product_raw r ON r.product_id = p.id
      WHERE b.slug IN ('arcteryx', 'mammut') ORDER BY b.slug, p.id
    `);
    return rows.map(catalogSource).filter(sourceIsVisible);
  } finally {
    await db.end();
  }
}
