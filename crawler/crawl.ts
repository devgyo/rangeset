import { parseArcteryx, type CatalogProduct } from "./adapters/arcteryx";
import { fetchProduct } from "./fetch";
import { CrawlStop, discover, fixtureUrl, PoliteClient } from "./http";

// Apparel and footwear only: packs, accessories, climbing gear and care products are skipped.
export const excludedCategory = /\b(packs?|bags?|accessor(y|ies)|gloves?|mitts?|hats?|caps?|toques?|beanies?|socks?|climbing gear|harness(es)?|chalk|product care|care|belts?|gaiters?|neck|headbands?|luggage|duffels?)\b/i;

export function isExcluded(category: string | null) {
  return !!category && excludedCategory.test(category);
}

export type CrawlResult = {
  discovered: Set<string>;
  records: Map<string, CatalogProduct>;
  absent: Set<string>;
};

export type Counts = { ok: number; failed: number };

export async function collect(known: Set<string>, counts: Counts, limit?: number): Promise<CrawlResult> {
  const client = new PoliteClient(limit);
  await client.loadRobots();
  const discovered = await discover(client);
  const missing = [...known].filter((url) => !discovered.has(url));
  console.log(JSON.stringify({
    event: "discovery", discovered: discovered.size, new: [...discovered].filter((url) => !known.has(url)).length,
    missing: missing.length, dbCompared: limit === undefined,
  }));

  const ordered = [...discovered].sort();
  // Sample across the catalog while fetching the requested fixture exactly once.
  const sample = [...new Set([fixtureUrl, ...ordered.filter((url) => url !== fixtureUrl)])];
  let urls = ordered;
  if (limit !== undefined) {
    const stride = Math.max(1, Math.floor((sample.length - 1) / Math.max(1, limit - 1)));
    urls = [fixtureUrl, ...sample.slice(1).filter((_, index) => index % stride === 0)].slice(0, limit);
  }

  const absent = new Set(missing);
  const records = new Map<string, CatalogProduct>();
  for (const url of urls) {
    if (!client.allows(url)) {
      console.log(JSON.stringify({ event: "robots_skip", url }));
      continue;
    }
    try {
      const { page, file } = await fetchProduct(client, url);
      if (page.status === 404 || page.offShop) {
        counts.failed++;
        absent.add(url);
        console.log(JSON.stringify({ event: "absent", url, status: page.status, finalUrl: page.finalUrl }));
        continue;
      }
      if (page.status !== 200) throw new Error(`HTTP ${page.status}`);
      const record = parseArcteryx(page.body, page.finalUrl, page.fetchedAt);
      if (isExcluded(record.category)) {
        console.log(JSON.stringify({ event: "category_skip", url, category: record.category }));
        continue;
      }
      const existing = records.get(record.externalId);
      if (!existing || (page.url === page.finalUrl && known.has(page.finalUrl))) records.set(record.externalId, record);
      counts.ok++;
      console.log(JSON.stringify({
        event: "parsed", id: record.externalId, name: record.name,
        category: record.category, variantCount: record.prices.length - 1,
        specs: Object.fromEntries(Object.entries(record.specs).filter(([, spec]) => spec.value !== null).map(([key, spec]) => [key, spec.value])),
        crossCheck: record.crossCheck, file, url,
      }));
    } catch (error) {
      counts.failed++;
      console.error(JSON.stringify({ event: "page_error", url, reason: error instanceof Error ? error.message : String(error) }));
      if (error instanceof CrawlStop) throw error;
    }
  }
  if (!records.size && (counts.failed || !counts.ok)) throw new CrawlStop("No products parsed; catalog changes were skipped");
  return { discovered, records, absent };
}
