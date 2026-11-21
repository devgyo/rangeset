import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";
import {gunzipSync} from "node:zlib";
import {CrawlBlocked, type Page} from "../../crawler/http";
import {compare, compareSnapshotStock, fields, productFacts, sample, variantsOf} from "../../scripts/content-verify/compare";
import {officialProduct, OfficialReader, parseSeries, seriesEvidence} from "../../scripts/content-verify/official";
import {failing, summarize, type ProductAudit} from "../../scripts/content-verify/report";
import {verifyProducts} from "../../scripts/content-verify/run";
import {checkCatalog, checkTranslations} from "../../scripts/content-verify/rules";
import {orderMammutSizes} from "../brand-sizes";

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

test("stock comparison uses same-day price snapshots by SKU and excludes snapshots more than six hours old", async () => {
  const fetchedAt = "2026-11-21T12:10:00Z";
  const capturedAt = "2026-11-21T06:10:00Z";
  for (const product of [arc, mammut]) {
    const snapshots = variantsOf(product).map((variant) => ({...variant, capturedAt}));
    assert.ok(snapshots.length);
    assert.equal(compareSnapshotStock(snapshots, product, fetchedAt, product.url!).status, "match");
    const changed = snapshots.map((variant, index) => index === 0 ? {...variant, inStock: !variant.inStock} : variant);
    const mismatch = compareSnapshotStock(changed, product, fetchedAt, product.url!);
    assert.equal(mismatch.status, "mismatch");
    assert.deepEqual(mismatch.stockWindow, {snapshotCapturedAt: [capturedAt], officialFetchedAt: fetchedAt});
    assert.match(compareSnapshotStock(changed, product, "2026-11-21T12:10:00.001Z", product.url!).reason!, /6-hour/);
    assert.match(compareSnapshotStock(changed, product, "2026-11-21T16:00:00Z", product.url!).reason!, /observation day/);
    assert.match(compareSnapshotStock([], product, fetchedAt, product.url!).reason!, /No successful/);
  }
  const snapshots = variantsOf(mammut).map((variant) => ({...variant, capturedAt}));
  const {products} = await verifyProducts([{
    ...mammut, snapshots, prices: mammut.prices.map((variant) => ({...variant, inStock: !variant.inStock})),
  }], {
    async product() { return {...mammutPage, fetchedAt}; },
    async series() { throw new Error("Unexpected series request"); },
  });
  assert.equal(products[0].results.find(({field}) => field === "variantStock")?.status, "match");
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
      snapshots: [{variantKey: variant.variant, priceCents: 10000, salePriceCents: null, currency: "USD",
        inStock: true, capturedAt: publishedAt}]},
  ]);
  for (const rule of ["nonpositive_price", "region_currency", "price_delta_above_50_percent", "identical_image_url"]) {
    assert.ok(issues.some((entry) => entry.rule === rule), rule);
  }
});

test("accepts published Arc'teryx size and length combinations and sorts Mammut labels", () => {
  const payload = {...arc.payload!, sizeOptions: {options: ["29-R", "30-R", "32-S", "34-T"].map((label) => ({label}))}};
  assert.ok(checkCatalog([{...arc, payload}]).every(({rule}) => rule !== "size_chart"));
  assert.deepEqual(orderMammutSizes(["S", "XS", "XXS", "XL", "2XL"]), ["XXS", "XS", "S", "XL", "2XL"]);
  assert.deepEqual(orderMammutSizes(["US 30 L", "US 30", "US 28", "US 30 S"]), ["US 28", "US 30 S", "US 30", "US 30 L"]);
  const reordered = {...mammut.payload!, variants: [...(mammut.payload!.variants as unknown[])].reverse()};
  assert.deepEqual(productFacts({...mammut, payload: reordered}).view.sizes, productFacts(mammut).view.sizes);
});

test("raises the weight ceiling only for hardshells with a published removable liner", () => {
  const payload = {...arc.payload!, weight: {value: "1390 g"}, description: "A hardshell."};
  const shell = {...arc, payload, specs: arc.specs.filter(({key}) => key !== "weight_g")};
  assert.ok(checkCatalog([shell]).some(({rule}) => rule === "weight_range_or_unit"));
  assert.ok(checkCatalog([{...shell, payload: {...payload, description: "This insulated hardshell comes with a removable liner vest."}}])
    .every(({rule}) => rule !== "weight_range_or_unit"));
});

test("equal published prices are comparable as no discount; missing discount data remains unverifiable", () => {
  const fact = (discountPrice: number | null) => productFacts({...arc, payload: {...arc.payload, price: 650, discountPrice}}).facts.salePrice;
  assert.equal(fact(650).value, "No discount");
  assert.equal(compare("salePrice", fact(650), fact(650), arcUrl).status, "match");
  assert.equal(compare("salePrice", fact(650), fact(500), arcUrl).status, "mismatch");
  assert.equal(compare("salePrice", fact(650), fact(null), arcUrl).status, "unverifiable");
});
