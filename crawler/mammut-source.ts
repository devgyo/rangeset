import { rename, writeFile } from "node:fs/promises";
import { CrawlStop, parseXml, PoliteClient } from "./http";
import { fetchProduct } from "./fetch";

import {mammutOrigin as origin, mammutProductUrl as mammutUrl} from "../lib/brand-urls";
export {mammutUrl};

const sitemap = origin + "/us/en/sitemap.xml";
export const mammutPolicy = {origin, productUrl: mammutUrl, sitemapAllowed: (url: string) => url === sitemap};

export type MammutFetch = {url: string; file?: string; reason?: string};
export type MammutManifest = {discovered: number; candidates: number; filtered: string[]; pages: MammutFetch[]; stopped?: string};
export const manifestPath = ".crawl/mammut-manifest.json";

export async function fetchMammut(save: (manifest: MammutManifest) => Promise<void>, previous?: MammutManifest) {
  const manifest: MammutManifest = {discovered: 0, candidates: 0, filtered: [], pages: []};
  if (previous?.stopped) throw new CrawlStop("Cached crawl stopped. Review the recorded reason before starting another crawl.");
  const client = new PoliteClient(undefined, mammutPolicy);
  try {
    await client.loadRobots();
    const entries = parseXml(await client.request(sitemap, "sitemap")).urlset?.url as {loc: unknown}[] | undefined;
    const urls = [...new Set((entries ?? []).flatMap(({loc}) => typeof loc === "string" && mammutUrl(loc) ? [loc] : []))];
    if (!urls.length) throw new CrawlStop("No US/EN Mammut product URLs found");
    manifest.discovered = urls.length;

    // Mammut article groups 10xx and 11xx are apparel, 25xx and 28xx include packs.
    // Include ambiguous garments and bags for verification on their individual pages.
    const candidates = urls.filter((url) => {
      const [, article, slug] = new URL(url).pathname.match(/\/products\/(\d{4})-\d{5}\/(.+)/)!;
      const garment = /\b(?:jacket|vest|hoody|hoodie|shirt|pants?|shorts?|tights?|skirt|dress|parka|pullover|sweater|tank|longsleeve|base-layer|one-piece|anorak|polo|singlet|top|cardigan|fleece|poncho|romper|bodysuit)\b/.test(slug);
      const pack = /\b(?:alto|wully|backpack|daypack|rucksack|nirvana|trion|ducan|lithium|xeron|aenergy|seon|neon|lithia|creon|spindrift|tour|protection-airbag|removable-airbag)\b/.test(slug);
      const excluded = /\b(?:shoe|shoes|boot|boots|sock|socks|glove|gloves|mittens?|beanie|cap|hat|belt|balaclava|gaiter|gaiters|headband|neck-gaiter|bag-cover|raincover|rain-cover|replacement|spare|cartridge)\b/.test(slug);
      const keep = !excluded && (/^1[01]/.test(article) || garment || /^25[12]0$/.test(article) || (/^(?:25|28)/.test(article) && pack && !/\b(?:messenger|tote|pouch|sacoche|wallet|waistpack|shoulder)\b/.test(slug)));
      if (!keep) manifest.filtered.push(url);
      return keep;
    });
    manifest.candidates = candidates.length;
    console.log(JSON.stringify({event: "discovery", discovered: urls.length, candidates: candidates.length}));
    const cached = new Map(previous?.pages.map((page) => [page.url, page]));
    for (const url of candidates) {
      const saved = cached.get(url);
      if (saved) {
        manifest.pages.push(saved);
        continue;
      }
      try {
        if (!client.allows(url)) {
          manifest.pages.push({url, reason: "Disallowed by robots.txt"});
          continue;
        }
        const {page, file} = await fetchProduct(client, url, "mammut");
        manifest.pages.push(page.status === 200 && !page.offShop ? {url, file} : {url, reason: `HTTP ${page.status} (${page.finalUrl})`});
      } catch (error) {
        if (error instanceof CrawlStop) throw error;
        manifest.pages.push({url, reason: error instanceof Error ? error.message : String(error)});
      }
      if (manifest.pages.length % 25 === 0) {
        console.log(JSON.stringify({event: "progress", pages: manifest.pages.length}));
        await save(manifest);
      }
    }
  } catch (error) {
    manifest.stopped = error instanceof Error ? error.message : String(error);
    console.error(manifest.stopped);
  }
  await save(manifest);
  return manifest;
}

export async function saveMammutManifest(manifest: MammutManifest) {
  const temporary = manifestPath + "." + process.pid + ".tmp";
  await writeFile(temporary, JSON.stringify(manifest, null, 2) + "\n");
  await rename(temporary, manifestPath);
}
