import assert from "node:assert/strict";
import { test } from "node:test";
import { gzipSync } from "node:zlib";
import { CrawlStop, discover, fixtureUrl, origin, PoliteClient, productUrl, userAgent } from "../http";

test("keeps only scoped US-English PDP URLs", () => {
  assert.equal(productUrl(fixtureUrl + "/"), fixtureUrl);
  for (const url of [
    fixtureUrl + "?search=beta", fixtureUrl + "?intlnk=featured", fixtureUrl + "%2Cother",
    origin + "/ca/en/shop/product", origin + "/api/product", "https://example.org/us/en/shop/product",
  ]) assert.equal(productUrl(url), undefined, url);
});

test("honors robots, unions a gzipped sitemap, and stops the crawl on protection", async (t) => {
  const robots = [
    "User-agent: *",
    "Disallow: /us/en/shop/private",
    "Allow: /",
  ].join("\n");
  const requests: { url: string; started: number }[] = [];
  const secondProduct = origin + "/us/en/shop/second-product";
  const productSet = (...urls: string[]) =>
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
    urls.map((url) => `<url><loc>${url}</loc></url>`).join("") + "</urlset>";
  t.mock.method(globalThis, "fetch", async (url: string, options: RequestInit) => {
    assert.equal(new Headers(options.headers).get("user-agent"), userAgent);
    assert.equal(options.redirect, "manual");
    requests.push({ url, started: performance.now() });
    if (url.endsWith("/robots.txt")) return new Response(robots);
    if (url.endsWith("/sitemap.xml")) return new Response(
      `<sitemapindex><sitemap><loc>${origin}/sitemap_1.xml.gz</loc></sitemap>` +
      `<sitemap><loc>${origin}/sitemap_2.xml</loc></sitemap></sitemapindex>`,
    );
    if (url.endsWith("/sitemap_1.xml.gz")) {
      return new Response(new Uint8Array(gzipSync(productSet(fixtureUrl, origin + "/ca/en/shop/not-us"))));
    }
    if (url.endsWith("/sitemap_2.xml")) return new Response(productSet(fixtureUrl, secondProduct));
    if (url === fixtureUrl) return new Response("<title>Just a moment...</title>");
    throw new Error("Unexpected request: " + url);
  });

  const client = new PoliteClient(5);
  await client.loadRobots();
  const sitemap = discover(client);
  await assert.rejects(client.request(fixtureUrl, "product"), /Concurrent crawl requests/);
  assert.deepEqual(await sitemap, new Set([fixtureUrl, secondProduct]));
  await assert.rejects(client.request(origin + "/us/en/shop/private", "product"), /disallowed by robots/);
  await assert.rejects(client.request(fixtureUrl, "product"), (error: unknown) =>
    error instanceof CrawlStop && error.message.includes("Challenge page"));
  assert.equal(requests.length, 5);
  assert.ok(requests.slice(1).every((request, index) => request.started - requests[index].started >= 1490));
});
