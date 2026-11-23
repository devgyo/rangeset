import {setTimeout as delay} from "node:timers/promises";
import {decode} from "html-entities";
import {parseArcteryx} from "../../crawler/adapters/arcteryx";
import {parseMammut, type MammutPayload} from "../../crawler/adapters/mammut";
import {arcPolicyFor, CrawlBlocked, CrawlPolicyDenied, CrawlStop, PoliteClient, type CrawlPolicy, type Page} from "../../crawler/http";
import {mammutPolicy} from "../../crawler/mammut-source";
import {catalogSource} from "../../lib/catalog/product";
import {mammutSource} from "../../lib/catalog/fixture";
import type {AuditProduct, Brand} from "./data";
import mappings from "../../data/mammut-product-lines.json";

export const mammutLines = new Map(mappings.map((line) => [line.external_id, line]));
type SeriesListing = {title: string; articles: Map<string, string>};

export class OfficialReader {
  private readonly clients = new Map<string, Promise<PoliteClient>>();
  private readonly listings = new Map<string, Promise<SeriesListing | undefined>>();
  private lastCompleted = 0;

  private async request<T>(operation: () => Promise<T>) {
    const remaining = this.lastCompleted + 1500 - performance.now();
    if (remaining > 0) await delay(Math.ceil(remaining));
    try {
      return await operation();
    } finally {
      this.lastCompleted = performance.now();
    }
  }

  private async read(url: string, policy: CrawlPolicy, scope: "product" | "series"): Promise<Page> {
    const approved = policy.productUrl(url);
    if (!approved) throw new CrawlPolicyDenied("URL outside the official page policy");
    const key = policy.origin + "/" + scope;
    let client = this.clients.get(key);
    if (!client) {
      const next = new PoliteClient(undefined, policy);
      client = this.request(() => next.loadRobots()).then(() => next);
      this.clients.set(key, client);
    }
    const ready = await client;
    const page = await this.request(() => ready.request(approved, "product"));
    if (page.status !== 200 || page.offShop || page.policyDenied) {
      throw new Error(page.status === 404 ? "HTTP 404" : `Unavailable official page (HTTP ${page.status})`);
    }
    return page;
  }

  product(brand: Brand, url: string) {
    return this.read(url, brand === "arcteryx" ? arcPolicyFor(url) : mammutPolicy, "product");
  }

  series(url: string) {
    const origin = new URL(url).origin;
    const path = origin === "https://www.mammut.com"
      ? /^\/us\/en\/(?:eiger-extreme|featured\/\d+(?:-\d+)?\/[a-z0-9-]+(?:\/page\/\d+)?)$/
      : /^\/collections\/[a-z0-9-]+$/;
    if (!["https://www.mammut.com", "https://au.mammut.com"].includes(origin) || !path.test(new URL(url).pathname)) {
      throw new CrawlPolicyDenied("URL outside Mammut public series pages");
    }
    const policy: CrawlPolicy = {
      origin,
      productUrl(value) {
        const link = new URL(value);
        if (link.origin !== origin || link.username || link.password || link.search || link.hash) return;
        return path.test(link.pathname) ? value : undefined;
      },
      sitemapAllowed: () => false,
    };
    // Cache only parsed membership, so the same source page is requested once per run.
    let listing = this.listings.get(url);
    if (!listing) {
      listing = this.read(url, policy, "series").then(parseSeries);
      this.listings.set(url, listing);
    }
    return listing;
  }
}

export function mustHalt(error: unknown) {
  return error instanceof CrawlBlocked || (error instanceof CrawlStop && !(error instanceof CrawlPolicyDenied));
}

export function officialProduct(page: Page, brand: Brand): AuditProduct {
  if (brand === "mammut") {
    const record = parseMammut(page.body, page.finalUrl, page.fetchedAt);
    const {specs, prices, ...row} = mammutSource(record);
    return {...catalogSource(row), brandSlug: brand, sku: record.externalId, payload: record.raw,
      prices, specs, recent: false, snapshots: []};
  }
  const record = parseArcteryx(page.body, page.finalUrl, page.fetchedAt);
  return {
    ...catalogSource({
      ...record, brand: "Arc'teryx", brandSlug: brand, status: "active", styleFamily: record.analyticsFamily,
      stockRatio: null, lastSeen: page.fetchedAt, payloadFetchedAt: page.fetchedAt, payload: record.raw,
    }),
    brandSlug: brand, sku: record.externalId, payload: record.raw,
    prices: record.prices, specs: Object.entries(record.specs).map(([key, value]) => ({key, ...value})),
    recent: false, snapshots: [],
  };
}

export function directMammutLine(payload: MammutPayload) {
  return payload.collection === "Eiger Extreme" ? payload.collection : null;
}

export function parseSeries(page: Page): SeriesListing | undefined {
  const title = decode(page.body.match(/<title[^>]*>([^<]+)/i)?.[1] ?? "").trim();
  if (!title) return;
  if (new URL(page.finalUrl).hostname === "www.mammut.com") {
    const cards = [...page.body.matchAll(/href="(\/us\/en\/products\/(\d{4}-\d{5})(?:-\d+)?\/[a-z0-9-]+)"[^>]*><div class="[^"]*_productNameSection"[^>]*>([^<]+)<\/div>/g)];
    if (cards.length || /"nbHits\\":0/.test(page.body)) {
      return {title, articles: new Map(cards.map(([, link, id, name]) => [id, `${decode(name)} · ${link}`]))};
    }
    return;
  }
  // Shopify public analytics lists the SKU with the handle of each rendered card.
  const meta = page.body.match(/\bvar meta\s*=\s*(\{[^\n]+\})\s*;/)?.[1];
  if (!meta) return;
  const products: {handle: string; variants: {sku: string | null; name: string}[]}[] = JSON.parse(meta).products;
  if (!Array.isArray(products)) return;
  const handles = new Set([...page.body.matchAll(/href="\/products\/([a-z0-9-]+)(?:[?"#])/g)].map((match) => match[1]));
  const visible = products.filter(({handle}) => handles.has(handle));
  if (!visible.length && products.length) return;
  const articles = new Map<string, string>();
  for (const product of visible) {
    for (const {sku, name} of product.variants) {
      const id = sku?.match(/^(\d{4}-\d{5})-\d+-\d+$/)?.[1];
      if (id && !articles.has(id)) articles.set(id, `${name} · ${sku}`);
    }
  }
  if (visible.length && !articles.size) return;
  return {title, articles};
}

export function seriesEvidence(listing: SeriesListing | undefined, article: string, series: string) {
  if (!listing || !listing.title.toLowerCase().includes(series.toLowerCase())) return;
  const match = listing.articles.get(article);
  const text = match ?? `${listing.title} · Listed article numbers: ${[...listing.articles.keys()].join(", ") || "none"}`;
  return {found: match !== undefined, text};
}
