import {decode} from "html-entities";
import {arcLeafOrigin, arcLeafProductUrl} from "../lib/brand-urls";
import {parseArcteryx, scripts, type CatalogProduct} from "./adapters/arcteryx";
import { fetchProduct } from "./fetch";
import {arcLeafPolicy, CrawlStop, discover, fixtureUrl, leafListings, PoliteClient} from "./http";

// Keep the main-store apparel, footwear and official accessory category.
export const excludedCategory = /\b(packs?|bags?|accessor(y|ies)|gloves?|mitts?|hats?|caps?|toques?|beanies?|socks?|climbing gear|harness(es)?|chalk|product care|care|belts?|gaiters?|neck|headbands?|luggage|duffels?)\b/i;

export function isExcluded(category: string | null) {
  return category !== "Accessories" && !!category && excludedCategory.test(category);
}

export type CrawlResult = {
  discovered: Set<string>;
  records: Map<string, CatalogProduct>;
  absent: Set<string>;
  covers?: (url: string) => boolean;
};

export type Counts = { ok: number; failed: number };

export async function collect(known: Set<string>, counts: Counts, limit?: number): Promise<CrawlResult> {
  const client = new PoliteClient(limit);
  await client.loadRobots();
  const discovered = await discover(client);
  const missing = [...known].filter((url) => !discovered.has(url));
  console.log(JSON.stringify({
    event: "discovery", discovered: discovered.size,
  }));

  const ordered = [...discovered].sort();
  // Sample across the catalog while fetching the requested fixture exactly once.
  const sample = [...new Set([fixtureUrl, ...ordered.filter((url) => url !== fixtureUrl)])];
  let urls = ordered;
  if (limit !== undefined) {
    const stride = Math.max(1, Math.floor((sample.length - 1) / Math.max(1, limit - 1)));
    urls = [fixtureUrl, ...sample.slice(1).filter((_, index) => index % stride === 0)].slice(0, limit);
  }

  return crawlProducts(client, discovered, urls, new Set(missing), known, counts);
}

export function leafListingProducts(html: string, listing: string) {
  const json = (id: string) => {
    const [block] = scripts(html, new RegExp(`\\bid\\s*=\\s*["']${id}["']`, "i"));
    return block ? JSON.parse(block) : null;
  };
  const expectedSlug = new URL(listing).pathname.split("/").at(-1);
  const props = json("__NEXT_DATA__")?.props?.pageProps;
  const itemList = json("seo-itemlist")?.itemListElement;
  const entries: unknown[] = props?.initialProductList;
  const invalid = () => new CrawlStop(`Unverifiable LEAF listing at ${listing}`);
  if (props?.country !== "us" || props.language !== "en" || !Array.isArray(props.slug) || props.slug.join("/") !== expectedSlug ||
    !Array.isArray(entries) || !entries.length || !Array.isArray(itemList)) throw invalid();

  const urls = new Map<string, string>();
  const seen = new Set<string>();
  for (const entry of entries) {
    const {sku, slug} = (entry ?? {}) as {sku?: unknown; slug?: unknown};
    const url = typeof slug === "string" && arcLeafProductUrl(arcLeafOrigin + "/us/en/shop/" + slug);
    if (!url || typeof sku !== "string" || !/^X\d{4,15}$/.test(sku) || seen.has(sku) || urls.has(url)) throw invalid();
    urls.set(url, sku);
    seen.add(sku);
  }
  const listed = new Set(itemList.map((entry) => typeof entry?.url === "string" && arcLeafProductUrl(entry.url)));
  const tiles = new Set<string>();
  for (const [tag] of html.matchAll(/<a\b[^>]*\bdata-testid=["']ssr-product-tile["'][^>]*>/gi)) {
    const href = tag.match(/\shref=["']([^"']+)["']/i)?.[1];
    if (!href) throw invalid();
    const product = arcLeafProductUrl(new URL(decode(href), listing).href);
    if (!product) throw invalid();
    tiles.add(product);
  }
  if (itemList.length !== urls.size || listed.size !== urls.size || tiles.size !== urls.size ||
    [...urls.keys()].some((url) => !listed.has(url) || !tiles.has(url))) throw invalid();
  if (/<(?:a|link)\b[^>]*\brel=["']next["']/i.test(html)) throw invalid();
  return urls;
}

export async function collectLeaf(counts: Counts, limit?: number): Promise<CrawlResult> {
  const client = new PoliteClient(limit, arcLeafPolicy);
  await client.loadRobots();
  const expected = new Map<string, string>();
  const bySku = new Map<string, string>();
  for (const listing of leafListings) {
    const page = await client.request(listing, "listing");
    if (page.status !== 200) throw new CrawlStop(`Invalid LEAF listing (HTTP ${page.status}) at ${listing}`);
    const products = leafListingProducts(page.body, page.finalUrl);
    for (const [url, sku] of products) {
      if ((expected.has(url) && expected.get(url) !== sku) || (bySku.has(sku) && bySku.get(sku) !== url)) {
        throw new CrawlStop(`Conflicting listing identity for LEAF SKU ${sku}`);
      }
      expected.set(url, sku);
      bySku.set(sku, url);
    }
    console.log(JSON.stringify({event: "leaf_listing", listing, products: products.size}));
  }
  const discovered = new Set(expected.keys());
  console.log(JSON.stringify({event: "discovery", source: "leaf", discovered: discovered.size}));
  const urls = [...discovered].sort();
  const previousFailures = counts.failed;
  const result = await crawlProducts(client, discovered, urls.slice(0, limit ?? urls.length), new Set(), new Set(), counts, expected);
  if (counts.failed > previousFailures) throw new CrawlStop("LEAF product coverage was incomplete");
  return result;
}

async function crawlProducts(client: PoliteClient, discovered: Set<string>, urls: string[], absent: Set<string>,
  known: Set<string>, counts: Counts, leaf?: ReadonlyMap<string, string>): Promise<CrawlResult> {
  const records = new Map<string, CatalogProduct>();
  for (const url of urls) {
    if (!client.allows(url)) {
      if (leaf) throw new CrawlStop(`LEAF product disallowed by robots.txt: ${url}`);
      console.log(JSON.stringify({ event: "robots_skip", url }));
      continue;
    }
    try {
      const { page, file } = await fetchProduct(client, url, leaf ? "arcteryx-leaf" : undefined);
      if (page.status === 404 || page.offShop) {
        counts.failed++;
        absent.add(url);
        console.log(JSON.stringify({ event: "absent", url, status: page.status, finalUrl: page.finalUrl }));
        continue;
      }
      if (page.status !== 200) throw new Error(`HTTP ${page.status}`);
      const record = parseArcteryx(page.body, page.finalUrl, page.fetchedAt);
      if (leaf && leaf.get(url) !== record.externalId) {
        throw new CrawlStop(`LEAF listing and product SKU disagree at ${url}`);
      }
      if (leaf && !record.category) throw new CrawlStop(`Unrecognized LEAF product category at ${url}`);
      if (!leaf && isExcluded(record.category)) {
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
