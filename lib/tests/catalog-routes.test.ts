import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";
import en from "../../messages/en.json";
import zh from "../../messages/zh.json";
import ja from "../../messages/ja.json";
import {betaShellComparison} from "../curated-comparison";
import {cardFields} from "../parameters/registry";

const site = process.env.TEST_SITE_URL;
const locales = ["", "/zh", "/ja"] as const;
const translations = {"": en, "/zh": zh, "/ja": ja};
const beta = "arcteryx-mens-beta-ar-jacket-1062-x000011062";
const adze = "arcteryx-adze-pant-walk-gently-0764-x000010764";
const shoe = "arcteryx-mens-konseal-gtx-shoe-9833-x000009833";
const shoeSlugs = readFileSync("docs/footwear-offline-v1.4.0.csv", "utf8").trim().split("\n").slice(1)
  .map((row) => row.match(/^"([^"]+)"/)![1]);

const options = {skip: site ? false : "Run against the local database-backed app with TEST_SITE_URL"};
const get = (path: string) => fetch(new URL(path, site), {redirect: "manual"});
const rendered = (response: Response) => response.text().then((html) => html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ""));

test("all three language catalogs, home navigation, and searches exclude footwear", options, async () => {
  for (const prefix of locales) {
    for (const path of ["/products", "/"]) {
      const route = path === "/" && prefix ? prefix : prefix + path;
      const response = await get(route);
      assert.equal(response.status, 200, route);
      const html = await rendered(response);
      assert.ok(!html.includes("Footwear"), prefix + path);
      for (const slug of shoeSlugs) assert.ok(!html.includes(slug), slug);
      if (path === "/products") {
        assert.match(html, /aria-haspopup="dialog" aria-expanded="false"/);
        assert.ok(html.includes(translations[prefix].ui.catalog_filters), prefix);
        assert.doesNotMatch(html, /<option value="featured"/);
        const cards = [...html.matchAll(/<article class="gear-card [^"]*">([\s\S]*?)<\/article>/g)];
        assert.ok(cards.length > 0, prefix);
        for (const [, card] of cards) {
          const keys = [...card.matchAll(/data-card-field="([^"]+)"/g)].map(([, key]) => key);
          assert.deepEqual(keys, cardFields.map(({key}) => key), prefix);
        }
      } else {
        assert.ok(html.includes(`action="${prefix}/products"`), prefix);
        assert.match(html, /<input[^>]*name="q"/);
      }
    }
  }
});

test("retired footwear detail returns 404 and no indexable product metadata in every language", options, async () => {
  for (const prefix of locales) {
    const response = await get(prefix + "/products/" + shoe);
    assert.equal(response.status, 404, prefix);
    assert.equal(response.headers.get("location"), null, prefix);
    const html = await response.text();
    assert.match(html, /noindex/i);
    assert.doesNotMatch(html, /property="og:image"|rel="alternate"|application\/ld\+json/i);
    for (const slug of [beta, adze]) assert.equal((await get(prefix + "/products/" + slug)).status, 200);
  }
});

test("all three comparisons discard footwear IDs and show an empty state for footwear-only IDs", options, async () => {
  for (const prefix of locales) {
    const mixed = await get(prefix + "/compare?ids=" + [...shoeSlugs.slice(0, 4), beta, adze].join(","));
    assert.equal(mixed.status, 200);
    const html = await rendered(mixed);
    assert.match(html, /class="comparison-matrix"/);
    assert.ok(html.includes("Beta AR Jacket") && html.includes("Adze Pant"));
    for (const slug of shoeSlugs) assert.ok(!html.includes(slug), prefix);
    const empty = await get(prefix + "/compare?ids=" + shoeSlugs.slice(0, 2).join(","));
    assert.equal(empty.status, 200);
    const noProducts = await rendered(empty);
    assert.doesNotMatch(noProducts, /class="comparison-matrix"/);
    assert.ok(noProducts.includes(translations[prefix].ui.select_two_to_four_products_to_compare), prefix);
    assert.ok(!noProducts.includes("Konseal GTX Shoe"), prefix);
  }
});

test("sitemap excludes every retired shoe slug in all languages", options, async () => {
  assert.equal(shoeSlugs.length, 34);
  const response = await get("/sitemap.xml");
  assert.equal(response.status, 200);
  const xml = await response.text();
  for (const prefix of locales) assert.ok(xml.includes(prefix + "/products/" + beta + "</loc>"));
  for (const slug of shoeSlugs) assert.ok(!xml.includes(slug), slug);
});

test("detail and comparison pages keep source controls, links and raw evidence out of every locale", options, async () => {
  const ifora = "arcteryx-womens-ifora-jacket-9524-x000009524";
  for (const prefix of locales) {
    for (const route of ["/products/" + ifora, "/compare?ids=" + ifora + "," + adze]) {
      const response = await get(prefix + route);
      assert.equal(response.status, 200, prefix + route);
      const html = await response.text();
      const markup = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
      assert.match(markup, /data-parameter-row/);
      assert.doesNotMatch(markup, /Show sources|显示来源|出典を表示|Read original text|查看原文|原文を見る|role="switch"|parameter-sources/i);
      assert.doesNotMatch(markup, /<a\b[^>]*href="https?:\/\/(?:[^/"]+\.)?arcteryx\.com\//i);
      assert.doesNotMatch(html, /product\.materials\[\d+\]|product\.features\[\d+\]|Supplementary source text/);
    }
  }
});

test("the unified category and its 301 redirects use English slugs and three language alternates", options, async () => {
  for (const prefix of locales) {
    const path = prefix + "/products/category/hardshell-jackets";
    const response = await get(path + "?sort=name");
    assert.equal(response.status, 200, path);
    const html = await rendered(response);
    assert.ok(html.includes(translations[prefix].taxonomy.hardshell_jackets));
    assert.match(html, /hreflang="zh-Hans"[^>]*\/zh\/products\/category\/hardshell-jackets/i);
    assert.match(html, /hreflang="ja"[^>]*\/ja\/products\/category\/hardshell-jackets/i);
    const legacy = await get(prefix + "/products?category=Shell+Jackets&q=beta");
    assert.equal(legacy.status, 301);
    assert.equal(legacy.headers.get("location"), prefix + "/products/category/outerwear?q=beta");
    const jackets = await get(prefix + "/jackets");
    assert.equal(jackets.status, 301);
    assert.equal(jackets.headers.get("location"), path);
  }
});

test("public catalog routes exclude Mammut and preserve Arc’teryx comparisons", options, async () => {
  const mammut = "mammut-1010-33030";
  for (const prefix of locales) {
    const listing = await rendered(await get(prefix + "/products?brand=mammut"));
    assert.match(listing, /gear-card/);
    assert.doesNotMatch(listing, /Mammut/i);
    const detail = await get(prefix + "/products/" + mammut);
    assert.equal(detail.status, 404, prefix);
    assert.match(await detail.text(), /noindex/i);
    const compare = await rendered(await get(prefix + "/compare?ids=" + [mammut, beta, adze].join(",")));
    assert.match(compare, /class="comparison-matrix"/);
    assert.match(compare, /Beta AR Jacket/);
    assert.match(compare, /Adze Pant/);
    assert.doesNotMatch(compare, /Mammut|Eiger Free Pro HS Hooded Jacket Men/i);
  }
  const response = await get("/api/catalog");
  assert.equal(response.status, 200);
  const cards = await response.json();
  assert.ok(cards.length > 0 && cards.every((card: {brandSlug: string}) => card.brandSlug === "arcteryx"));
  assert.doesNotMatch(await (await get("/sitemap.xml")).text(), /mammut/i);
  if (process.env.RANGESET_LOCAL_CATALOG !== "1") {
    assert.equal((await get("/out/1010-33030?to=brand")).status, 404);
  }
});

test("each translated detail includes Product JSON-LD and the official-site route", options, async () => {
  for (const prefix of locales) {
    const response = await get(prefix + "/products/" + beta);
    assert.equal(response.status, 200);
    const html = await response.text();
    const match = html.match(/<script type="application\/ld\+json">([\s\S]+?)<\/script>/);
    assert.ok(match, prefix);
    const data = JSON.parse(match[1]);
    assert.equal(data["@type"], "Product");
    assert.equal(data.name, "Beta AR Jacket");
    assert.equal(data.sku, "X000011062");
    assert.equal(data.brand["@type"], "Brand");
    assert.ok(data.image && data.offers.price > 0 && data.offers.priceCurrency);
    assert.ok(!Object.hasOwn(data.offers, "availability"));
    assert.equal(new URL(data.url).pathname, prefix + "/products/" + beta);
    assert.equal(data.offers.url, data.url);
    assert.match(data.image, /^https:\/\//);
    assert.ok(html.includes(translations[prefix].ui.view_on_brand_site));
    assert.match(html, /href="\/out\/X000011062\?to=brand/);
  }
  assert.match(await (await get("/robots.txt")).text(), /Disallow: \/out/);
});

test("catalog HTML omits full product specs and detail fields", options, async () => {
  const html = await (await get("/products")).text();
  const flight = [...html.matchAll(/self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)<\/script>/g)]
    .map(([, value]) => JSON.parse(value)).join("");
  assert.match(flight, /"previewCount":24/);
  assert.doesNotMatch(flight, /"cardValueCount":/);
  const response = await get("/api/catalog");
  assert.equal(response.status, 200);
  const cards = await response.json();
  assert.ok(cards.length > 24);
  for (const field of ["summary", "specs", "colorways", "description", "facility", "hero", "verifiedAt", "url", "salePrice", "inStock", "stockRatio"]) {
    assert.ok(cards.every((card: Record<string, unknown>) => !(field in card)), field);
  }
  assert.equal((html.match(/<article class="gear-card/g) ?? []).length, 24);
});

test("catalog exposes crawlable, disjoint server-rendered pages in all three languages", options, async () => {
  const cardPaths = (html: string) => [...html.matchAll(/<article class="gear-card[^"]*">\s*<a[^>]*href="([^"]+)"/g)]
    .map(([, href]) => href);
  for (const prefix of locales) {
    const first = await rendered(await get(prefix + "/products"));
    const secondResponse = await get(prefix + "/products?page=2");
    assert.equal(secondResponse.status, 200);
    const second = await rendered(secondResponse);
    assert.match(first, /<a[^>]*href="[^"]*\/products\?page=2"[^>]*>/);
    assert.doesNotMatch(first, /<noscript>[\s\S]*?href="[^"]*\/products\?page=2"/);
    assert.equal(cardPaths(first).length, 24);
    assert.equal(cardPaths(second).length, 24);
    assert.equal(new Set([...cardPaths(first), ...cardPaths(second)]).size, 48);
    assert.ok(second.includes(prefix + "/products?page=2"));
  }
  const next = await get("/zh/products/category/hardshell-jackets/page/2");
  assert.equal(next.status, 200);
  assert.equal(cardPaths(await rendered(next)).length, 24);
});


test("the published Beta AR and Beta SL comparison has a localized canonical and stays separate from the tool", options, async () => {
  const {path, slugs} = betaShellComparison;
  const sitemap = await (await get("/sitemap.xml")).text();
  for (const prefix of locales) {
    const response = await get(prefix + path);
    assert.equal(response.status, 200);
    const html = await rendered(response);
    assert.match(html, /<h1[^>]*>[^<]*Beta AR[^<]*Beta SL/);
    assert.match(html, /class="comparison-matrix"/);
    const header = html.split('class="comparison-matrix"')[1]?.match(/<thead>[\s\S]*?<\/thead>/)?.[0];
    assert.ok(header, prefix);
    assert.match(header, /line-clamp-2/);
    assert.doesNotMatch(header, /<img|<button|href="\/out\//);
    assert.match(html, /class="comparison-product-info"/);
    assert.match(html, /class="compare-overview-table"/);
    assert.ok(html.indexOf('class="compare-overview-table"') < html.indexOf('class="comparison-matrix"'));
    const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
    assert.ok(canonical);
    assert.equal(new URL(canonical).pathname, prefix + path);
    assert.ok(sitemap.includes(prefix + path + "</loc>"));
    const product = await rendered(await get(prefix + "/products/" + slugs[0]));
    assert.ok(product.includes('href="' + prefix + path + '"'));
    const tool = await rendered(await get(prefix + "/compare?ids=" + slugs.join(",")));
    assert.match(tool, /name="robots" content="noindex, follow"/);
    if (process.env.RANGESET_LOCAL_CATALOG !== "1") assert.doesNotMatch(html, /name="robots" content="noindex/);
  }
});
