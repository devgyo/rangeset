import { performance } from "node:perf_hooks";
import { setTimeout as delay } from "node:timers/promises";
import { gunzipSync } from "node:zlib";
import robotsParser from "robots-parser";
import { XMLParser, XMLValidator } from "fast-xml-parser";

import {arcLeafOrigin, arcLeafProductUrl, arcOrigin as origin, arcProductUrl as productUrl} from "../lib/brand-urls";
export {origin, productUrl};
export const userAgent = "Mozilla/5.0 (compatible; specbot/0.1)";
export const fixtureUrl = `${origin}/us/en/shop/mens/beta-ar-jacket-1062`;
const sitemapIndex = `${origin}/sitemap.xml`;
const expectedSitemaps = ["sitemap_1.xml", "sitemap_2.xml"];
const maxBytes = 32 * 1024 * 1024;

export class CrawlStop extends Error {}

export class CrawlPolicyDenied extends CrawlStop {}

export class CrawlBlocked extends CrawlStop {
  constructor(message: string, readonly url: string, readonly fetchedAt: string) {
    super(message);
  }
}

type Kind = "robots" | "sitemap" | "listing" | "product";
export type Page = { url: string; finalUrl: string; status: number; fetchedAt: string; body: string; offShop?: boolean; policyDenied?: boolean };

function isChallenge(headers: Headers, body: string) {
  return headers.get("cf-mitigated") === "challenge" ||
    /<title[^>]*>\s*(?:access denied|request blocked|sorry,? you have been blocked|just a moment|attention required|robot check|security check|are you a robot|forbidden|captcha)\b/i.test(body) ||
    /id=["'](?:challenge-form|px-captcha|cf-challenge-running)["']|\b(?:automated access (?:has been|is) (?:blocked|denied)|verify (?:that )?you are (?:a )?human|please enable javascript and cookies to continue)\b/i.test(body);
}

async function readBody(response: Response) {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) throw new Error("Response exceeds size limit");
      chunks.push(Buffer.from(value));
    }
  } finally {
    await reader.cancel();
  }
  const bytes = Buffer.concat(chunks, size);
  return (bytes[0] === 0x1f && bytes[1] === 0x8b ? gunzipSync(bytes, { maxOutputLength: maxBytes }) : bytes).toString("utf8");
}

export type CrawlPolicy = {
  origin: string;
  productUrl: (value: string) => string | undefined;
  productPath?: string;
  sitemapAllowed: (value: string) => boolean;
  listingAllowed?: (value: string) => boolean;
};

export const arcPolicy: CrawlPolicy = {
  origin, productUrl, productPath: "/us/en/shop/",
  sitemapAllowed: (url) => url === sitemapIndex || /^https:\/\/arcteryx\.com\/sitemap_[12]\.xml(?:\.gz)?$/.test(url),
};

export const leafListings = [
  "base-layer", "cold-weather-insulation", "combat-uniforms", "load-carriage-equipment",
  "mid-layer", "softshell", "wet-weather-protection",
].map((category) => arcLeafOrigin + "/us/en/c/" + category);

export const arcLeafPolicy: CrawlPolicy = {
  origin: arcLeafOrigin, productUrl: arcLeafProductUrl, productPath: "/us/en/shop/",
  sitemapAllowed: () => false,
  listingAllowed: (url) => leafListings.includes(url),
};

export function arcPolicyFor(url: string) {
  return arcLeafProductUrl(url) ? arcLeafPolicy : arcPolicy;
}

export class PoliteClient {
  private robots?: ReturnType<typeof robotsParser>;
  private lastRequest = -Infinity;
  private interval = 1500;
  private busy = false;
  private productRequests = 0;

  constructor(private readonly productLimit?: number, private readonly policy = arcPolicy) {}

  async loadRobots() {
    const robotsUrl = this.policy.origin + "/robots.txt";
    const page = await this.request(robotsUrl, "robots");
    if (page.status !== 200 || /^\s*</.test(page.body) || !/^\s*user-agent\s*:/im.test(page.body)) {
      throw new CrawlPolicyDenied(`Unable to read robots.txt (HTTP ${page.status})`);
    }
    this.robots = robotsParser(robotsUrl, page.body);
    this.interval = Math.max(1500, (this.robots.getCrawlDelay(userAgent) ?? 0) * 1000);
  }

  allows(url: string) {
    return this.robots?.isAllowed(url, userAgent) === true;
  }

  async request(url: string, kind: Kind): Promise<Page> {
    if (this.busy) throw new CrawlStop("Concurrent crawl requests are disabled");
    this.busy = true;
    try {
      return await this.perform(url, kind);
    } finally {
      this.busy = false;
    }
  }

  private async perform(url: string, kind: Kind): Promise<Page> {
    let finalUrl = url;
    for (let hop = 0; hop <= 5; hop++) {
      const allowedUrl = kind === "robots" ? finalUrl === this.policy.origin + "/robots.txt"
        : kind === "product" ? this.policy.productUrl(finalUrl) === finalUrl
        : kind === "listing" ? this.policy.listingAllowed?.(finalUrl)
        : this.policy.sitemapAllowed(finalUrl);
      if (!allowedUrl || (kind !== "robots" && !this.allows(finalUrl))) {
        throw new CrawlPolicyDenied(`URL outside crawl policy or disallowed by robots.txt: ${finalUrl}`);
      }

      if (kind === "product") {
        if (this.productLimit !== undefined && this.productRequests >= this.productLimit) {
          throw new CrawlStop("Dry-run product request limit reached");
        }
        this.productRequests++;
      }
      const options = {
        redirect: "manual" as const,
        headers: { "User-Agent": userAgent, Accept: kind === "product" ? "text/html" : "*/*", "Accept-Encoding": "gzip" },
      };
      let remaining = this.interval - (performance.now() - this.lastRequest);
      while (remaining > 0) {
        await delay(Math.ceil(remaining));
        remaining = this.interval - (performance.now() - this.lastRequest);
      }
      const signal = AbortSignal.timeout(45_000);
      this.lastRequest = performance.now();
      const response = await fetch(finalUrl, {...options, signal});
      const fetchedAt = new Date().toISOString();
      if (response.status === 403 || response.status === 429) {
        await response.body?.cancel().catch(() => {});
        throw new CrawlBlocked(`HTTP ${response.status} at ${finalUrl}`, finalUrl, fetchedAt);
      }
      if (response.headers.get("cf-mitigated") === "challenge") {
        await response.body?.cancel().catch(() => {});
        throw new CrawlStop(`Challenge page at ${finalUrl}`);
      }
      const status = response.status;
      const body = await readBody(response).catch((error: unknown) => {
        signal.throwIfAborted();
        throw error;
      });
      if (isChallenge(response.headers, body)) throw new CrawlStop(`Challenge page at ${finalUrl}`);
      const page = { url, finalUrl, status, fetchedAt, body };
      const location = response.headers.get("location");
      if (![301, 302, 303, 307, 308].includes(status) || !location) return page;

      const next = new URL(location, finalUrl).href;
      if (kind === "product") {
        const normalized = this.policy.productUrl(next);
        if (!normalized) {
          const target = new URL(next);
          if (this.policy.productPath && target.origin === this.policy.origin && target.pathname.startsWith(this.policy.productPath)) {
            return {...page, policyDenied: true};
          }
          return { ...page, finalUrl: next, offShop: true };
        }
        finalUrl = normalized;
      } else {
        finalUrl = next;
      }
    }
    throw new Error(`Too many redirects at ${url}`);
  }
}

const parser = new XMLParser({ removeNSPrefix: true, processEntities: false, parseTagValue: false,
  isArray: (name, path) => (path === "sitemapindex.sitemap" && name === "sitemap") || (path === "urlset.url" && name === "url"),
});

export function parseXml(page: Page) {
  if (page.status !== 200 || /<!DOCTYPE/i.test(page.body) || XMLValidator.validate(page.body) !== true) {
    throw new CrawlStop(`Invalid sitemap (HTTP ${page.status}): ${page.finalUrl}`);
  }
  return parser.parse(page.body);
}

export async function discover(client: PoliteClient) {
  const index = parseXml(await client.request(sitemapIndex, "sitemap"));
  const children: unknown[] = index.sitemapindex?.sitemap?.map((entry: { loc: unknown }) => entry.loc) ?? [];
  const discovered = new Set<string>();
  for (const name of expectedSitemaps) {
    const child = children.find((loc): loc is string => loc === `${origin}/${name}` || loc === `${origin}/${name}.gz`);
    if (!child) throw new CrawlStop(`Sitemap index is missing ${name}`);
    const sitemap = parseXml(await client.request(child, "sitemap"));
    const entries: { loc: unknown }[] | undefined = sitemap.urlset?.url;
    if (!entries?.length) throw new CrawlStop(`Sitemap is empty: ${child}`);
    for (const { loc } of entries) {
      const url = typeof loc === "string" ? productUrl(loc) : undefined;
      if (url) discovered.add(url);
    }
  }
  if (!discovered.size) throw new CrawlStop("No US/EN shop URLs in sitemaps");
  return discovered;
}
