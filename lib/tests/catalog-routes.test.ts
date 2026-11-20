import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";
import en from "../../messages/en.json";
import zh from "../../messages/zh.json";
import ja from "../../messages/ja.json";

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
    for (const path of ["/products", "/products?category=Footwear&q=Konseal+GTX+Shoe", "/"]) {
      const route = path === "/" && prefix ? prefix : prefix + path;
      const response = await get(route);
      assert.equal(response.status, 200, route);
      const html = await rendered(response);
      assert.ok(!html.includes("Footwear"), prefix + path);
      for (const slug of shoeSlugs) assert.ok(!html.includes(slug), slug);
      if (path === "/products") assert.match(html, /class="gear-card /);
      if (path.includes("?")) assert.ok(!html.includes('class="gear-card '), prefix + path);
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
