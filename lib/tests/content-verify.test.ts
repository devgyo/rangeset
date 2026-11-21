import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";
import {gunzipSync} from "node:zlib";
import {CrawlBlocked, type Page} from "../../crawler/http";
import {compare, fields, productFacts, sample} from "../../scripts/content-verify/compare";
import {officialProduct, OfficialReader, parseSeries, seriesEvidence} from "../../scripts/content-verify/official";
import {failing, summarize, type ProductAudit} from "../../scripts/content-verify/report";
import {verifyProducts} from "../../scripts/content-verify/run";
import {checkCatalog, checkTranslations} from "../../scripts/content-verify/rules";

const publishedAt = "2026-11-20T00:00:00Z";
const mammutUrl = "https://www.mammut.com/us/en/products/1013-02962/broad-peak-in-hooded-jacket-men";
const arcUrl = "https://arcteryx.com/us/en/shop/mens/beta-ar-jacket-1062";
function page(url: string, body: string): Page {
  return {url, finalUrl: url, status: 200, body, fetchedAt: publishedAt};
}
const mammutPage = page(mammutUrl, gunzipSync(readFileSync("crawler/tests/fixtures/mammut-broad-peak.html.gz")).toString());
const arcPage = page(arcUrl, readFileSync("crawler/tests/fixtures/beta-ar-jacket.html", "utf8"));
const mammut = officialProduct(mammutPage, "mammut");
const arc = officialProduct(arcPage, "arcteryx");

test("content verification samples both brands proportionally, always includes recent rows, and supports a full run", () => {
  const inventory = Array.from({length: 800}, (_, id) => ({
    ...(id < 200 ? arc : mammut), id, recent: id < 12 || id === 200,
  }));
  const selected = sample(inventory, "2026-11-21", false);
  assert.equal(selected.length, 42);
  assert.equal(selected.filter(({brandSlug}) => brandSlug === "arcteryx").length, 12);
  assert.equal(selected.filter(({brandSlug}) => brandSlug === "mammut").length, 30);
  assert.equal(selected.filter(({recent}) => recent).length, 13);
  assert.deepEqual(sample(inventory, "2026-11-21", false), selected);
  assert.equal(sample(inventory, "2026-11-21", true).length, 800);
});

test("product facts use both official adapters and compare normalized materials and false stock independently", () => {
  const {facts} = productFacts(mammut);
  assert.equal(facts.sku.value, "1013-02962");
  assert.equal(facts.currency.value, "USD");
  assert.equal(facts.mainFabric.value, "Pertex® Quantum");
  assert.ok(Array.isArray(facts.composition.value) && facts.composition.value.length);
  assert.ok(productFacts(arc).facts.weight.value);
  assert.equal(compare("colors", {value: ["Black", "Red"]}, {value: ["Red", "Black"]}, mammutUrl).status, "match");
  const stock = (value: boolean | null) => ({value: [["Black S", value]], evidence: "Black, S"});
  assert.equal(compare("variantStock", stock(false), stock(false), mammutUrl).status, "match");
  assert.equal(compare("variantStock", stock(false), stock(null), mammutUrl).status, "unverifiable");
  const wrong = compare("variantStock", stock(false), stock(true), mammutUrl);
  assert.equal(wrong.status, "mismatch");
  assert.equal(wrong.evidence, "Black, S");
  assert.equal(wrong.url, mammutUrl);
  assert.equal(compare("productLine", {value: ["Eiger Extreme"]}, {value: []}, mammutUrl).status, "unverifiable");
  assert.equal(compare("productLine", {value: ["Eiger Extreme"]}, {value: [], confirmedAbsence: true}, mammutUrl).status, "mismatch");
});

test("Mammut product and evidence requests use separate policies on the same host", async (t) => {
  const seriesUrl = "https://www.mammut.com/us/en/featured/5810/featured-eiger-extreme";
  const requests: string[] = [];
  t.mock.method(globalThis, "fetch", async (url: string, options: RequestInit) => {
    requests.push(url);
    assert.doesNotMatch(new Headers(options.headers).get("user-agent")!, /rangeset/i);
    if (url.endsWith("/robots.txt")) return new Response("User-agent: *\nAllow: /");
    if (url === mammutUrl) return new Response(mammutPage.body);
    if (url === seriesUrl) return new Response('<title>Eiger Extreme</title><a href="/us/en/products/1010-33030-0001/eiger"><div class="card_productNameSection">Eiger</div></a>');
    throw new Error("Unexpected request");
  });
  const reader = new OfficialReader();
  await reader.product("mammut", mammutUrl);
  const listing = await reader.series(seriesUrl);
  assert.equal(seriesEvidence(listing, "1010-33030", "Eiger Extreme")?.found, true);
  assert.equal(await reader.series(seriesUrl), listing);
  assert.equal(requests.filter((url) => url === seriesUrl).length, 1);
});

test("series verification accepts visible cards with an exact article and the correct series title", () => {
  const url = "https://www.mammut.com/us/en/featured/5810/featured-eiger-extreme";
  const listing = parseSeries(page(url, '<title>Eiger Extreme | Mammut</title>' +
    '<a href="/us/en/products/1010-33030-0001/eiger"><div class="card_productNameSection">Eiger Jacket</div></a>' +
    '<a href="/us/en/products/1010-33031-0001/eiger">Unrelated link</a>'));
  assert.match(seriesEvidence(listing, "1010-33030", "Eiger Extreme")?.text ?? "", /1010-33030-0001/);
  assert.equal(seriesEvidence(listing, "1010-33031", "Eiger Extreme")?.found, false);
  assert.equal(seriesEvidence(listing, "1010-33030", "Mountain Pro"), undefined);
  const au = parseSeries(page("https://au.mammut.com/collections/aenergy", '<title>Aenergy - Mammut Australia</title>' +
    '<a href="/products/matching">Aenergy</a><script>var meta = {"products":[{"handle":"matching","variants":[{"name":"Aenergy","sku":"1013-04830-1324-117"}]},{"handle":"other","variants":[{"name":"Other","sku":"1013-04831-1324-117"}]}]};</script>'));
  assert.equal(seriesEvidence(au, "1013-04830", "Aenergy")?.found, true);
  assert.equal(seriesEvidence(au, "1013-04831", "Aenergy")?.found, false);
});

test("an official 403 or 429 stops all product requests and is excluded from accuracy", async () => {
  for (const code of [403, 429]) {
    let reads = 0;
    const {products, stopped} = await verifyProducts([arc, mammut, mammut], {
      async product() {
        reads++;
        throw new CrawlBlocked(`HTTP ${code}`, arcUrl, publishedAt);
      },
      async series() { throw new Error("Unexpected series request"); },
    });
    assert.equal(reads, 1);
    assert.equal(stopped, `HTTP ${code}`);
    const summary = summarize(products);
    assert.equal(summary.total.unverifiable, fields.length * 3);
    assert.equal(summary.total.accuracy, null);
    assert.equal(failing(summary, stopped), true);
  }
});

test("unverifiable rows never affect denominators and four field errors fail even at 98%", () => {
  const results: ProductAudit["results"] = [
    ...Array.from({length: 196}, () => ({field: "weight", status: "match"} as const)),
    ...Array.from({length: 4}, () => ({field: "sku", status: "mismatch"} as const)),
    {field: "fit", status: "unverifiable"},
  ];
  const summary = summarize([{brand: "mammut", sku: mammut.sku, name: mammut.name, url: mammutUrl, results}]);
  assert.equal(summary.total.accuracy, 0.98);
  assert.equal(summary.brands.mammut.fields.fit.accuracy, null);
  assert.equal(failing(summary, null), true);
  assert.equal(failing(summarize([{brand: "mammut", sku: mammut.sku, name: mammut.name, url: mammutUrl,
    results: [{field: "sku", status: "match"}, {field: "fit", status: "unverifiable"}]}]), null), false);
});

test("translated catalog terms agree with the glossary and allow protected names", () => {
  assert.deepEqual(checkTranslations(), []);
});

test("offline rules flag price, currency, snapshot changes and identical images without fetching", () => {
  const variant = mammut.prices.find(({variant}) => variant && variant !== "")!;
  const issues = checkCatalog([
    {...mammut, prices: [...mammut.prices, {...variant, price: -1, currency: "CAD"}]},
    {...mammut, sku: "1013-02963", prices: [...mammut.prices, {...variant, price: 40, currency: "USD"}],
      snapshots: [{variantKey: variant.variant, priceCents: 10000, salePriceCents: null, currency: "USD"}]},
  ]);
  for (const rule of ["nonpositive_price", "region_currency", "price_delta_above_50_percent", "identical_image_url"]) {
    assert.ok(issues.some((entry) => entry.rule === rule), rule);
  }
});
